'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useLocations, useCreateLocation, useUpdateLocation, useDeleteLocation } from '@/hooks/use-locations';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { Plus, Edit, Trash2, MapPin, Radar } from 'lucide-react';
import { useToast } from '@/components/ui/toaster';

export default function LocationsPage() {
  useAuth();
  const { toast } = useToast();
  const { data: locations, isLoading } = useLocations();
  const createLocation = useCreateLocation();
  const updateLocation = useUpdateLocation();
  const deleteLocation = useDeleteLocation();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<any>(null);
  const [form, setForm] = useState({
    name: '', address: '', latitude: '', longitude: '', geofenceRadius: '100',
  });
  const [deleteConfirm, setDeleteConfirm] = useState<any>(null);

  const openCreate = () => {
    setEditingLocation(null);
    setForm({ name: '', address: '', latitude: '', longitude: '', geofenceRadius: '100' });
    setDialogOpen(true);
  };

  const openEdit = (location: any) => {
    setEditingLocation(location);
    setForm({
      name: location.name,
      address: location.address || '',
      latitude: location.latitude?.toString() || '',
      longitude: location.longitude?.toString() || '',
      geofenceRadius: location.geofenceRadius?.toString() || '100',
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      const payload: Record<string, unknown> = {
        name: form.name,
        address: form.address || undefined,
      };
      if (form.latitude) payload.latitude = parseFloat(form.latitude);
      if (form.longitude) payload.longitude = parseFloat(form.longitude);
      payload.geofenceRadius = form.geofenceRadius ? parseInt(form.geofenceRadius) : 100;

      if (editingLocation) {
        await updateLocation.mutateAsync({ id: editingLocation.id, ...payload });
        toast({ title: 'Location updated' });
      } else {
        await createLocation.mutateAsync(payload);
        toast({ title: 'Location created' });
      }
      setDialogOpen(false);
    } catch (err: any) {
      toast({ title: 'Error', description: err.response?.data?.error?.message || 'Failed', variant: 'destructive' });
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await deleteLocation.mutateAsync(deleteConfirm.id);
      toast({ title: 'Location deleted' });
      setDeleteConfirm(null);
    } catch (err: any) {
      toast({ title: 'Error', description: err.response?.data?.error?.message || 'Failed', variant: 'destructive' });
    }
  };

  const formatRadius = (meters: number | null | undefined) => {
    if (!meters) return 'No geofence';
    if (meters >= 1000) return `${(meters / 1000).toFixed(1)} km`;
    return `${meters} m`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Locations</h1>
          <p className="text-muted-foreground">Manage work locations for GPS clock-in verification</p>
        </div>
        <Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" />Add Location</Button>
      </div>

      {isLoading ? (
        <div className="text-center py-10 text-muted-foreground">Loading...</div>
      ) : !locations?.length ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <MapPin className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-semibold mb-1">No work locations yet</h3>
            <p className="text-muted-foreground mb-6 max-w-sm">
              Locations enable GPS clock-in verification so employees can only clock in when they are on-site.
            </p>
            <Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" />Add Location</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {locations.map((location: any) => (
            <Card key={location.id}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-primary" />
                  <CardTitle className="text-base">{location.name}</CardTitle>
                </div>
                <Badge variant={location.status === 'ACTIVE' ? 'default' : 'secondary'}>
                  {location.status}
                </Badge>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-2">
                  {location.address || 'No address set'}
                </p>
                <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
                  <span className="flex items-center gap-1">
                    <Radar className="h-3 w-3" />
                    {formatRadius(location.geofenceRadius)}
                  </span>
                  {location.latitude && location.longitude && (
                    <span>{location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}</span>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <div className="text-xs text-muted-foreground">
                    {location._count?.shifts || 0} shifts
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(location)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setDeleteConfirm(location)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingLocation ? 'Edit Location' : 'Create Location'}</DialogTitle>
            <DialogDescription>
              {editingLocation ? 'Update the location details.' : 'Add a new work location for clock-in verification.'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Main Office" />
            </div>
            <div className="space-y-2">
              <Label>Address</Label>
              <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="123 Main St, City" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Latitude</Label>
                <Input type="number" step="any" value={form.latitude} onChange={(e) => setForm({ ...form, latitude: e.target.value })} placeholder="40.7128" />
              </div>
              <div className="space-y-2">
                <Label>Longitude</Label>
                <Input type="number" step="any" value={form.longitude} onChange={(e) => setForm({ ...form, longitude: e.target.value })} placeholder="-74.0060" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Geofence Radius (meters)</Label>
              <Input
                type="number"
                min={0}
                max={100000}
                value={form.geofenceRadius}
                onChange={(e) => setForm({ ...form, geofenceRadius: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Employees must be within this radius to clock in. Default: 100m.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={!form.name || createLocation.isPending || updateLocation.isPending}>
              {(createLocation.isPending || updateLocation.isPending) ? 'Saving...' : editingLocation ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteConfirm} onOpenChange={(open) => { if (!open) setDeleteConfirm(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Location</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &ldquo;{deleteConfirm?.name}&rdquo;?
              {(deleteConfirm?._count?.shifts || 0) > 0 && (
                <span className="block mt-2 text-amber-600">
                  {deleteConfirm._count.shifts} shift(s) reference this location. They will be unlinked.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteLocation.isPending}>
              {deleteLocation.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
