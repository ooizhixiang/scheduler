import { Injectable, Logger } from '@nestjs/common';
import * as Handlebars from 'handlebars';
import * as fs from 'fs';
import * as path from 'path';
import { NotificationType } from '@prisma/client';

interface TemplateResult {
  subject: string;
  html: string;
}

const TEMPLATE_SUBJECTS: Record<string, string> = {
  'schedule-published': 'New Schedule Published',
  'schedule-unpublished': 'Schedule Unpublished',
  'schedule-amended': 'Schedule Updated',
  'view-reminder': 'Reminder: View Your Schedule',
  'employee-invite': 'You have been invited to Scheduler',
  'password-reset': 'Password Reset - Scheduler',
  'day-off-decision': 'Day Off Request Update',
  'missing-clock-in': 'Missing Clock-In Reminder',
  'approval-nudge': 'Pending Approval Requires Attention',
  'employee-joined': 'New Team Member Has Joined',
  'missing-employees': 'Alert: Multiple Employees Missing',
  'all-clear': 'All Clear: Team Fully Clocked In',
  'generic': 'Notification from Scheduler',
};

const TYPE_TO_TEMPLATE: Partial<Record<NotificationType, string>> = {
  SCHEDULE_PUBLISHED: 'schedule-published',
  SCHEDULE_UNPUBLISHED: 'schedule-unpublished',
  SCHEDULE_AMENDED: 'schedule-amended',
  SCHEDULE_VIEW_REMINDER: 'view-reminder',
  ACCOUNT_INVITE: 'employee-invite',
  PASSWORD_RESET: 'password-reset',
  EMPLOYEE_JOINED: 'employee-joined',
  MISSING_EMPLOYEES: 'missing-employees',
  ALL_CLEAR: 'all-clear',
};

@Injectable()
export class EmailTemplateService {
  private readonly logger = new Logger(EmailTemplateService.name);
  private readonly templates = new Map<string, HandlebarsTemplateDelegate>();
  private baseTemplate: HandlebarsTemplateDelegate | null = null;
  private readonly templateDir: string;

  constructor() {
    this.templateDir = path.join(__dirname, '..', '..', 'templates', 'emails');
    this.loadTemplates();
  }

  private loadTemplates() {
    try {
      // Load base layout
      const basePath = path.join(this.templateDir, 'base.hbs');
      if (fs.existsSync(basePath)) {
        this.baseTemplate = Handlebars.compile(fs.readFileSync(basePath, 'utf-8'));
      }

      // Load all .hbs files
      if (fs.existsSync(this.templateDir)) {
        const files = fs.readdirSync(this.templateDir).filter((f) => f.endsWith('.hbs') && f !== 'base.hbs');
        for (const file of files) {
          const name = file.replace('.hbs', '');
          const content = fs.readFileSync(path.join(this.templateDir, file), 'utf-8');
          this.templates.set(name, Handlebars.compile(content));
        }
      }

      this.logger.log(`Loaded ${this.templates.size} email templates`);
    } catch (err) {
      this.logger.warn(`Failed to load email templates: ${err}`);
    }
  }

  compile(type: NotificationType, data: Record<string, any>): TemplateResult {
    const templateName = TYPE_TO_TEMPLATE[type] || 'generic';
    const template = this.templates.get(templateName) || this.templates.get('generic');

    if (!template) {
      // Fallback: minimal inline HTML
      return {
        subject: data.title || 'Notification from Scheduler',
        html: `<h2>${data.title || 'Notification'}</h2><p>${data.body || ''}</p>`,
      };
    }

    const contentHtml = template(data);
    const subject = data.subject || TEMPLATE_SUBJECTS[templateName] || 'Notification from Scheduler';

    // Wrap in base layout if available
    const html = this.baseTemplate
      ? this.baseTemplate({ subject, content: contentHtml })
      : contentHtml;

    return { subject, html };
  }
}
