'use client';

import * as React from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardHeader from '@mui/material/CardHeader';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Divider from '@mui/material/Divider';
import FormControl from '@mui/material/FormControl';
import FormControlLabel from '@mui/material/FormControlLabel';
import IconButton from '@mui/material/IconButton';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import Snackbar from '@mui/material/Snackbar';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TablePagination from '@mui/material/TablePagination';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { ArrowClockwiseIcon } from '@phosphor-icons/react/dist/ssr/ArrowClockwise';
import { ClockIcon } from '@phosphor-icons/react/dist/ssr/Clock';
import { NotePencilIcon } from '@phosphor-icons/react/dist/ssr/NotePencil';
import { PlusIcon } from '@phosphor-icons/react/dist/ssr/Plus';
import { SparkleIcon } from '@phosphor-icons/react/dist/ssr/Sparkle';
import { TrashIcon } from '@phosphor-icons/react/dist/ssr/Trash';
import dayjs from 'dayjs';

import { RoleGuard } from '@/components/auth/role-guard';
import type { UserRole } from '@/types/user';
import { useUser } from '@/hooks/use-user';
import type { AppointmentSlotResponse, DoctorResponse, PaginatedResponse, SlotStatus, SlotToggleResponse } from '@/lib/api';
import {
  createSlot,
  deleteSlot,
  generateSlotsForDoctor,
  getDoctorProfile,
  getDoctors,
  getSlots,
  toggleSlotActive,
  updateSlot,
} from '@/lib/api';

// ── helpers ────────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  SlotStatus,
  { label: string; color: 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' }
> = {
  available: { label: 'Available', color: 'success' },
  booked:    { label: 'Booked',    color: 'info' },
  cancelled: { label: 'Cancelled', color: 'error' },
  blocked:   { label: 'Blocked',   color: 'warning' },
};

const SLOT_STATUSES: SlotStatus[] = ['available', 'booked', 'cancelled', 'blocked'];

function toLocalDatetimeValue(iso: string): string {
  // Convert ISO-8601 to value accepted by <input type="datetime-local">
  return dayjs(iso).format('YYYY-MM-DDTHH:mm');
}

// ── sub-components ─────────────────────────────────────────────────────────────

interface CreateSlotDialogProps {
  open: boolean;
  doctors: DoctorResponse[];
  /** When set, the doctor field is pre-filled and locked (used for doctor role). */
  lockedDoctorId?: number;
  onClose: () => void;
  onCreated: () => void;
}

function CreateSlotDialog({ open, doctors, lockedDoctorId, onClose, onCreated }: CreateSlotDialogProps): React.JSX.Element {
  const [form, setForm] = React.useState({
    doctor_id: lockedDoctorId ? String(lockedDoctorId) : '',
    start_time: '',
    end_time: '',
    capacity: '1',
    status: 'available' as SlotStatus,
  });

  React.useEffect(() => {
    if (lockedDoctorId) setForm((f) => ({ ...f, doctor_id: String(lockedDoctorId) }));
  }, [lockedDoctorId]);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  function reset(): void {
    // Preserve locked doctor_id so re-opening the dialog passes validation.
    setForm({ doctor_id: lockedDoctorId ? String(lockedDoctorId) : '', start_time: '', end_time: '', capacity: '1', status: 'available' });
    setError(null);
  }

  async function handleSave(): Promise<void> {
    if (!form.doctor_id || !form.start_time || !form.end_time) {
      setError('Doctor, start time, and end time are required.');
      return;
    }
    const doctor = doctors.find((d) => String(d.id) === form.doctor_id);
    if (!doctor) { setError('Doctor not found.'); return; }
    setSaving(true);
    setError(null);
    try {
      await createSlot({
        doctor_id: doctor.id,
        clinic_id: doctor.clinic_id,
        start_time: new Date(form.start_time).toISOString(),
        end_time: new Date(form.end_time).toISOString(),
        capacity: Number(form.capacity) || 1,
        status: form.status,
      });
      reset();
      onCreated();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create slot.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onClose={() => { reset(); onClose(); }} maxWidth="sm" fullWidth>
      <DialogTitle>Create Slot</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {error ? <Alert severity="error">{error}</Alert> : null}

          {lockedDoctorId ? (
            <TextField
              label="Doctor"
              size="small"
              value={doctors.find((d) => d.id === lockedDoctorId)?.doctor_name ?? `Doctor #${lockedDoctorId}`}
              disabled
            />
          ) : (
            <FormControl fullWidth size="small" required>
              <InputLabel>Doctor</InputLabel>
              <Select
                label="Doctor"
                value={form.doctor_id}
                onChange={(e) => { setForm((f) => ({ ...f, doctor_id: e.target.value })); }}
              >
                {doctors.map((d) => (
                  <MenuItem key={d.id} value={String(d.id)}>
                    {d.doctor_name ?? `Doctor #${d.id}`}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          <TextField
            label="Start Time"
            type="datetime-local"
            size="small"
            InputLabelProps={{ shrink: true }}
            value={form.start_time}
            onChange={(e) => { setForm((f) => ({ ...f, start_time: e.target.value })); }}
            required
          />
          <TextField
            label="End Time"
            type="datetime-local"
            size="small"
            InputLabelProps={{ shrink: true }}
            value={form.end_time}
            onChange={(e) => { setForm((f) => ({ ...f, end_time: e.target.value })); }}
            required
          />
          <TextField
            label="Capacity"
            type="number"
            size="small"
            inputProps={{ min: 1, max: 10 }}
            value={form.capacity}
            onChange={(e) => { setForm((f) => ({ ...f, capacity: e.target.value })); }}
          />
          <FormControl fullWidth size="small">
            <InputLabel>Status</InputLabel>
            <Select
              label="Status"
              value={form.status}
              onChange={(e) => { setForm((f) => ({ ...f, status: e.target.value as SlotStatus })); }}
            >
              {SLOT_STATUSES.map((s) => (
                <MenuItem key={s} value={s}>{STATUS_CONFIG[s].label}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => { reset(); onClose(); }}>Cancel</Button>
        <Button variant="contained" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving…' : 'Create'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

interface EditSlotDialogProps {
  slot: AppointmentSlotResponse | null;
  onClose: () => void;
  onUpdated: () => void;
}

function EditSlotDialog({ slot, onClose, onUpdated }: EditSlotDialogProps): React.JSX.Element {
  const [form, setForm] = React.useState({
    start_time: '',
    end_time: '',
    capacity: '1',
    status: 'available' as SlotStatus,
    force: false,
  });
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (slot) {
      setForm({
        start_time: toLocalDatetimeValue(slot.start_time),
        end_time: toLocalDatetimeValue(slot.end_time),
        capacity: String(slot.capacity),
        status: slot.status,
        force: false,
      });
      setError(null);
    }
  }, [slot]);

  async function handleSave(): Promise<void> {
    if (!slot) return;
    setSaving(true);
    setError(null);
    try {
      await updateSlot(
        slot.id,
        {
          start_time: new Date(form.start_time).toISOString(),
          end_time: new Date(form.end_time).toISOString(),
          capacity: Number(form.capacity) || 1,
          status: form.status,
        },
        form.force,
      );
      onUpdated();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update slot.');
    } finally {
      setSaving(false);
    }
  }

  const isBooked = (slot?.booked_count ?? 0) > 0;

  return (
    <Dialog open={Boolean(slot)} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Edit Slot #{slot?.id}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {error ? <Alert severity="error">{error}</Alert> : null}
          {isBooked ? (
            <Alert severity="warning">
              This slot has active bookings. Time/capacity changes require the Force override.
            </Alert>
          ) : null}

          <TextField
            label="Start Time"
            type="datetime-local"
            size="small"
            InputLabelProps={{ shrink: true }}
            value={form.start_time}
            onChange={(e) => { setForm((f) => ({ ...f, start_time: e.target.value })); }}
          />
          <TextField
            label="End Time"
            type="datetime-local"
            size="small"
            InputLabelProps={{ shrink: true }}
            value={form.end_time}
            onChange={(e) => { setForm((f) => ({ ...f, end_time: e.target.value })); }}
          />
          <TextField
            label="Capacity"
            type="number"
            size="small"
            inputProps={{ min: 1, max: 10 }}
            value={form.capacity}
            onChange={(e) => { setForm((f) => ({ ...f, capacity: e.target.value })); }}
          />
          <FormControl fullWidth size="small">
            <InputLabel>Status</InputLabel>
            <Select
              label="Status"
              value={form.status}
              onChange={(e) => { setForm((f) => ({ ...f, status: e.target.value as SlotStatus })); }}
            >
              {SLOT_STATUSES.map((s) => (
                <MenuItem key={s} value={s}>{STATUS_CONFIG[s].label}</MenuItem>
              ))}
            </Select>
          </FormControl>

          {isBooked ? (
            <FormControlLabel
              control={
                <Switch
                  checked={form.force}
                  onChange={(e) => { setForm((f) => ({ ...f, force: e.target.checked })); }}
                  color="warning"
                />
              }
              label="Force override (allow editing booked slot)"
            />
          ) : null}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving…' : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

interface GenerateSlotsDialogProps {
  open: boolean;
  doctors: DoctorResponse[];
  /** When set, the doctor field is pre-filled and locked (used for doctor role). */
  lockedDoctorId?: number;
  onClose: () => void;
  onGenerated: (count: number) => void;
}

function GenerateSlotsDialog({ open, doctors, lockedDoctorId, onClose, onGenerated }: GenerateSlotsDialogProps): React.JSX.Element {
  const [doctorId, setDoctorId] = React.useState(lockedDoctorId ? String(lockedDoctorId) : '');
  const [mode, setMode] = React.useState<'rolling' | 'range'>('rolling');
  const [daysAhead, setDaysAhead] = React.useState('60');
  const [dateFrom, setDateFrom] = React.useState('');
  const [dateTo, setDateTo] = React.useState('');
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (lockedDoctorId) setDoctorId(String(lockedDoctorId));
  }, [lockedDoctorId]);

  function reset(): void {
    setDoctorId(lockedDoctorId ? String(lockedDoctorId) : '');
    setMode('rolling');
    setDaysAhead('60');
    setDateFrom('');
    setDateTo('');
    setError(null);
  }

  async function handleGenerate(): Promise<void> {
    if (!doctorId) { setError('Please select a doctor.'); return; }
    if (mode === 'range' && (!dateFrom || !dateTo)) { setError('Both From and To dates are required.'); return; }

    setSaving(true);
    setError(null);
    try {
      const result = await generateSlotsForDoctor(Number(doctorId), {
        days_ahead: mode === 'rolling' ? Number(daysAhead) : undefined,
        date_from: mode === 'range' ? dateFrom : undefined,
        date_to: mode === 'range' ? dateTo : undefined,
      });
      reset();
      onGenerated(result.generated);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to generate slots.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onClose={() => { reset(); onClose(); }} maxWidth="sm" fullWidth>
      <DialogTitle>Generate Slots for Doctor</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {error ? <Alert severity="error">{error}</Alert> : null}

          {lockedDoctorId ? (
            <TextField
              label="Doctor"
              size="small"
              value={doctors.find((d) => d.id === lockedDoctorId)?.doctor_name ?? `Doctor #${lockedDoctorId}`}
              disabled
            />
          ) : (
            <FormControl fullWidth size="small" required>
              <InputLabel>Doctor</InputLabel>
              <Select
                label="Doctor"
                value={doctorId}
                onChange={(e) => { setDoctorId(e.target.value); }}
              >
                {doctors.map((d) => (
                  <MenuItem key={d.id} value={String(d.id)}>
                    {d.doctor_name ?? `Doctor #${d.id}`}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          <FormControl fullWidth size="small">
            <InputLabel>Generation Mode</InputLabel>
            <Select
              label="Generation Mode"
              value={mode}
              onChange={(e) => { setMode(e.target.value as 'rolling' | 'range'); }}
            >
              <MenuItem value="rolling">Rolling window (days ahead)</MenuItem>
              <MenuItem value="range">Specific date range</MenuItem>
            </Select>
          </FormControl>

          {mode === 'rolling' ? (
            <TextField
              label="Days Ahead"
              type="number"
              size="small"
              inputProps={{ min: 1, max: 365 }}
              value={daysAhead}
              onChange={(e) => { setDaysAhead(e.target.value); }}
            />
          ) : (
            <>
              <TextField
                label="From Date"
                type="date"
                size="small"
                InputLabelProps={{ shrink: true }}
                value={dateFrom}
                onChange={(e) => { setDateFrom(e.target.value); }}
              />
              <TextField
                label="To Date"
                type="date"
                size="small"
                InputLabelProps={{ shrink: true }}
                value={dateTo}
                onChange={(e) => { setDateTo(e.target.value); }}
              />
            </>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => { reset(); onClose(); }}>Cancel</Button>
        <Button variant="contained" onClick={handleGenerate} disabled={saving}>
          {saving ? 'Generating…' : 'Generate'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ── main content ───────────────────────────────────────────────────────────────

function SlotsContent(): React.JSX.Element {
  const { user } = useUser();
  const role = user?.role as UserRole | undefined;
  const isDoctor = role === 'doctor';

  const [slots, setSlots] = React.useState<AppointmentSlotResponse[]>([]);
  const [doctors, setDoctors] = React.useState<DoctorResponse[]>([]);
  /** The logged-in doctor's own profile ID — set only when role === 'doctor'. */
  const [ownDoctorId, setOwnDoctorId] = React.useState<number | undefined>(undefined);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [page, setPage] = React.useState(0);
  const [rowsPerPage] = React.useState(20);

  // Filters
  const [filterDoctor, setFilterDoctor] = React.useState('');
  const [filterStatus, setFilterStatus] = React.useState<SlotStatus | 'all'>('all');
  const [filterDateFrom, setFilterDateFrom] = React.useState('');
  const [filterDateTo, setFilterDateTo] = React.useState('');
  const [includeAll, setIncludeAll] = React.useState(true);

  // Dialogs
  const [createOpen, setCreateOpen] = React.useState(false);
  const [editTarget, setEditTarget] = React.useState<AppointmentSlotResponse | null>(null);
  const [generateOpen, setGenerateOpen] = React.useState(false);
  const [deleteTarget, setDeleteTarget] = React.useState<AppointmentSlotResponse | null>(null);
  const [deleting, setDeleting] = React.useState(false);
  const [deleteError, setDeleteError] = React.useState<string | null>(null);

  // Snackbar
  const [snack, setSnack] = React.useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' });

  function showSnack(message: string, severity: 'success' | 'error' = 'success'): void {
    setSnack({ open: true, message, severity });
  }

  // When role is doctor, resolve their own profile once and lock the filter.
  React.useEffect(() => {
    if (!isDoctor) return;
    getDoctorProfile()
      .then((profile) => {
        setOwnDoctorId(profile.id);
        setFilterDoctor(String(profile.id));
        setDoctors([profile]);   // doctors list only needs own entry for label lookup
      })
      .catch(() => { /* non-fatal – page still loads */ });
  }, [isDoctor]);

  const fetchDoctors = React.useCallback(async () => {
    if (isDoctor) return;   // doctor branch handled above
    try {
      const result = await getDoctors({ limit: 200 });
      setDoctors(result.items);
    } catch {
      /* non-fatal */
    }
  }, [isDoctor]);

  const fetchSlots = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getSlots({
        doctor_id: filterDoctor ? Number(filterDoctor) : undefined,
        status: filterStatus !== 'all' ? filterStatus : undefined,
        date_from: filterDateFrom ? new Date(filterDateFrom).toISOString() : undefined,
        date_to: filterDateTo ? new Date(filterDateTo).toISOString() : undefined,
        include_all: includeAll,
        limit: 500,
      });
      setSlots(data);
      setPage(0);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load slots.');
    } finally {
      setLoading(false);
    }
  }, [filterDoctor, filterStatus, filterDateFrom, filterDateTo, includeAll]);

  React.useEffect(() => {
    void fetchDoctors();
  }, [fetchDoctors]);

  React.useEffect(() => {
    void fetchSlots();
  }, [fetchSlots]);

  async function handleToggleActive(slot: AppointmentSlotResponse): Promise<void> {
    try {
      const result: SlotToggleResponse = await toggleSlotActive(slot.id);
      showSnack(result.message);
      void fetchSlots();
    } catch (err: unknown) {
      showSnack(err instanceof Error ? err.message : 'Failed to toggle slot.', 'error');
    }
  }

  async function handleDelete(): Promise<void> {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteSlot(deleteTarget.id);
      setDeleteTarget(null);
      showSnack(`Slot #${deleteTarget.id} deleted.`);
      void fetchSlots();
    } catch (err: unknown) {
      setDeleteError(err instanceof Error ? err.message : 'Failed to delete slot.');
    } finally {
      setDeleting(false);
    }
  }

  function getDoctorName(doctorId: number): string {
    const d = doctors.find((x) => x.id === doctorId);
    return d?.doctor_name ?? `Doctor #${doctorId}`;
  }

  const paginated = slots.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  return (
    <Stack spacing={3}>
      {/* Header */}
      <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={2}>
        <Stack direction="row" spacing={1} alignItems="center">
          <ClockIcon size={28} />
          <Typography variant="h4">Slot Management</Typography>
        </Stack>
        <Stack direction="row" spacing={1}>
          <Tooltip title="Refresh">
            <IconButton onClick={() => { void fetchSlots(); }}>
              <ArrowClockwiseIcon />
            </IconButton>
          </Tooltip>
          {!isDoctor ? (
            <Button
              variant="outlined"
              startIcon={<SparkleIcon />}
              onClick={() => { setGenerateOpen(true); }}
            >
              Generate Slots
            </Button>
          ) : null}
          <Button
            variant="contained"
            startIcon={<PlusIcon />}
            onClick={() => { setCreateOpen(true); }}
          >
            Add Slot
          </Button>
        </Stack>
      </Stack>

      {/* Filters */}
      <Card sx={{ p: 2 }}>
        <Stack direction="row" spacing={2} flexWrap="wrap" alignItems="center" gap={2}>
          {/* Doctor filter — hidden for doctor role (auto-locked to own profile) */}
          {!isDoctor ? (
            <FormControl size="small" sx={{ minWidth: 200 }}>
              <InputLabel>Doctor</InputLabel>
              <Select
                label="Doctor"
                value={filterDoctor}
                onChange={(e) => { setFilterDoctor(e.target.value); }}
              >
                <MenuItem value="">All Doctors</MenuItem>
                {doctors.map((d) => (
                  <MenuItem key={d.id} value={String(d.id)}>
                    {d.doctor_name ?? `Doctor #${d.id}`}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          ) : null}

          {/* Status filter */}
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel>Status</InputLabel>
            <Select
              label="Status"
              value={filterStatus}
              onChange={(e) => { setFilterStatus(e.target.value as SlotStatus | 'all'); }}
            >
              <MenuItem value="all">All Statuses</MenuItem>
              {SLOT_STATUSES.map((s) => (
                <MenuItem key={s} value={s}>{STATUS_CONFIG[s].label}</MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Date filters */}
          <TextField
            label="From"
            type="date"
            size="small"
            InputLabelProps={{ shrink: true }}
            value={filterDateFrom}
            onChange={(e) => { setFilterDateFrom(e.target.value); }}
            sx={{ minWidth: 160 }}
          />
          <TextField
            label="To"
            type="date"
            size="small"
            InputLabelProps={{ shrink: true }}
            value={filterDateTo}
            onChange={(e) => { setFilterDateTo(e.target.value); }}
            sx={{ minWidth: 160 }}
          />

          {/* Include all toggle */}
          <FormControlLabel
            control={
              <Switch
                size="small"
                checked={includeAll}
                onChange={(e) => { setIncludeAll(e.target.checked); }}
              />
            }
            label="Include past / inactive"
          />

          {/* Clear */}
          <Button
            size="small"
            variant="text"
            onClick={() => {
              if (!isDoctor) setFilterDoctor('');
              setFilterStatus('all');
              setFilterDateFrom('');
              setFilterDateTo('');
              setIncludeAll(true);
            }}
          >
            Clear
          </Button>
        </Stack>
      </Card>

      {/* Table */}
      {error ? <Alert severity="error">{error}</Alert> : null}
      <Card>
        <CardHeader
          title={`Slots (${slots.length})`}
          titleTypographyProps={{ variant: 'subtitle1' }}
          sx={{ py: 1.5 }}
        />
        <Divider />
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            <Box sx={{ overflowX: 'auto' }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>ID</TableCell>
                    <TableCell>Doctor</TableCell>
                    <TableCell>Date</TableCell>
                    <TableCell>Start</TableCell>
                    <TableCell>End</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Booked</TableCell>
                    <TableCell>Capacity</TableCell>
                    <TableCell>Active</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {paginated.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} align="center">
                        <Typography variant="body2" color="text.secondary" sx={{ py: 3 }}>
                          No slots found. Adjust filters or generate slots for a doctor.
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginated.map((slot) => {
                      const cfg = STATUS_CONFIG[slot.status] ?? STATUS_CONFIG.available;
                      const dateStr = slot.date
                        ? dayjs(slot.date).format('MMM D, YYYY')
                        : dayjs(slot.start_time).format('MMM D, YYYY');
                      return (
                        <TableRow key={slot.id} hover sx={{ opacity: slot.is_active ? 1 : 0.5 }}>
                          <TableCell>#{slot.id}</TableCell>
                          <TableCell>{getDoctorName(slot.doctor_id)}</TableCell>
                          <TableCell>{dateStr}</TableCell>
                          <TableCell>{dayjs(slot.start_time).format('h:mm A')}</TableCell>
                          <TableCell>{dayjs(slot.end_time).format('h:mm A')}</TableCell>
                          <TableCell>
                            <Chip label={cfg.label} color={cfg.color} size="small" />
                          </TableCell>
                          <TableCell>{slot.booked_count}</TableCell>
                          <TableCell>{slot.capacity}</TableCell>
                          <TableCell>
                            <Tooltip title={slot.is_active ? 'Click to deactivate' : 'Click to activate'}>
                              <Switch
                                size="small"
                                checked={slot.is_active}
                                onChange={() => { void handleToggleActive(slot); }}
                                color="success"
                              />
                            </Tooltip>
                          </TableCell>
                          <TableCell align="right">
                            <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                              <Tooltip title="Edit slot">
                                <IconButton
                                  size="small"
                                  onClick={() => { setEditTarget(slot); }}
                                >
                                  <NotePencilIcon size={16} />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Delete slot">
                                <span>
                                  <IconButton
                                    size="small"
                                    color="error"
                                    onClick={() => { setDeleteTarget(slot); }}
                                    disabled={slot.booked_count > 0}
                                  >
                                    <TrashIcon size={16} />
                                  </IconButton>
                                </span>
                              </Tooltip>
                            </Stack>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </Box>
            <TablePagination
              component="div"
              count={slots.length}
              page={page}
              rowsPerPage={rowsPerPage}
              rowsPerPageOptions={[rowsPerPage]}
              onPageChange={(_, p) => { setPage(p); }}
            />
          </>
        )}
      </Card>

      {/* Create dialog */}
      <CreateSlotDialog
        open={createOpen}
        doctors={doctors}
        lockedDoctorId={ownDoctorId}
        onClose={() => { setCreateOpen(false); }}
        onCreated={() => {
          setCreateOpen(false);
          showSnack('Slot created.');
          void fetchSlots();
        }}
      />

      {/* Edit dialog */}
      <EditSlotDialog
        slot={editTarget}
        onClose={() => { setEditTarget(null); }}
        onUpdated={() => {
          setEditTarget(null);
          showSnack('Slot updated.');
          void fetchSlots();
        }}
      />

      {/* Generate dialog */}
      <GenerateSlotsDialog
        open={generateOpen}
        doctors={doctors}
        lockedDoctorId={ownDoctorId}
        onClose={() => { setGenerateOpen(false); }}
        onGenerated={(count) => {
          setGenerateOpen(false);
          showSnack(`Generated ${count} new slot${count !== 1 ? 's' : ''}.`);
          void fetchSlots();
        }}
      />

      {/* Delete confirm dialog */}
      <Dialog open={Boolean(deleteTarget)} onClose={() => { setDeleteTarget(null); }}>
        <DialogTitle>Delete Slot #{deleteTarget?.id}?</DialogTitle>
        <DialogContent>
          {deleteError ? <Alert severity="error" sx={{ mb: 1 }}>{deleteError}</Alert> : null}
          <Typography variant="body2">
            {dayjs(deleteTarget?.start_time).format('MMM D, YYYY h:mm A')}
            {' → '}
            {dayjs(deleteTarget?.end_time).format('h:mm A')}
          </Typography>
          <Typography variant="body2" color="text.secondary">This action cannot be undone.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setDeleteTarget(null); setDeleteError(null); }}>Cancel</Button>
          <Button variant="contained" color="error" onClick={() => { void handleDelete(); }} disabled={deleting}>
            {deleting ? 'Deleting…' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snack.open}
        autoHideDuration={4000}
        onClose={() => { setSnack((s) => ({ ...s, open: false })); }}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert severity={snack.severity} onClose={() => { setSnack((s) => ({ ...s, open: false })); }}>
          {snack.message}
        </Alert>
      </Snackbar>
    </Stack>
  );
}

// ── page export ────────────────────────────────────────────────────────────────

export default function Page(): React.JSX.Element {
  return (
    <RoleGuard allowedRoles={['admin', 'super_admin', 'doctor']}>
      <SlotsContent />
    </RoleGuard>
  );
}
