import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Badge,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Tabs,
  TabsContent,
  TabsList,
  TabsTab,
  Checkbox,
  Label,
  Textarea,
  DatePicker,
  TimePicker,
  Progress,
  Alert,
  AlertDescription,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '../ui';
import {
  Search,
  Filter,
  Calendar,
  Clock,
  User,
  FileText,
  Download,
  Upload,
  RefreshCw,
  Settings,
  Eye,
  Edit,
  Trash2,
  Plus,
  CheckCircle,
  XCircle,
  AlertCircle,
  Play,
  Pause,
  MoreHorizontal
} from 'lucide-react';

// Types
interface WorklistItem {
  id: string;
  patientId: string;
  patientName: string;
  patientBirthDate: string;
  patientSex: 'M' | 'F' | 'O';
  accessionNumber: string;
  studyInstanceUID: string;
  studyDescription: string;
  modality: string;
  scheduledDateTime: string;
  performingPhysician: string;
  referringPhysician: string;
  studyStatus: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';
  priority: 'ROUTINE' | 'URGENT' | 'STAT' | 'HIGH';
  bodyPart: string;
  contrast: boolean;
  estimatedDuration: number; // minutes
  notes: string;
  createdAt: string;
  updatedAt: string;
}

interface WorklistFilter {
  dateRange: {
    start: Date | null;
    end: Date | null;
  };
  modality: string[];
  status: string[];
  priority: string[];
  physician: string;
  patientName: string;
  accessionNumber: string;
  bodyPart: string;
}

interface WorklistStats {
  total: number;
  scheduled: number;
  inProgress: number;
  completed: number;
  cancelled: number;
  noShow: number;
  avgDuration: number;
  completionRate: number;
}

const WorklistManagement: React.FC = () => {
  const [worklistItems, setWorklistItems] = useState<WorklistItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<WorklistItem[]>([]);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<WorklistStats | null>(null);
  const [activeTab, setActiveTab] = useState('worklist');
  const [showFilters, setShowFilters] = useState(false);
  const [editingItem, setEditingItem] = useState<WorklistItem | null>(null);
  const [showNewItemDialog, setShowNewItemDialog] = useState(false);

  // Filter state
  const [filters, setFilters] = useState<WorklistFilter>({
    dateRange: { start: null, end: null },
    modality: [],
    status: [],
    priority: [],
    physician: '',
    patientName: '',
    accessionNumber: '',
    bodyPart: ''
  });

  // Load worklist data
  const loadWorklist = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Simulate API call
      const response = await fetch('/api/worklist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filters })
      });
      
      if (!response.ok) throw new Error('Failed to load worklist');
      
      const data = await response.json();
      setWorklistItems(data.items);
      setStats(data.stats);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  // Apply filters
  useEffect(() => {
    let filtered = [...worklistItems];

    // Date range filter
    if (filters.dateRange.start && filters.dateRange.end) {
      filtered = filtered.filter(item => {
        const itemDate = new Date(item.scheduledDateTime);
        return itemDate >= filters.dateRange.start! && itemDate <= filters.dateRange.end!;
      });
    }

    // Modality filter
    if (filters.modality.length > 0) {
      filtered = filtered.filter(item => filters.modality.includes(item.modality));
    }

    // Status filter
    if (filters.status.length > 0) {
      filtered = filtered.filter(item => filters.status.includes(item.studyStatus));
    }

    // Priority filter
    if (filters.priority.length > 0) {
      filtered = filtered.filter(item => filters.priority.includes(item.priority));
    }

    // Text filters
    if (filters.patientName) {
      filtered = filtered.filter(item => 
        item.patientName.toLowerCase().includes(filters.patientName.toLowerCase())
      );
    }

    if (filters.accessionNumber) {
      filtered = filtered.filter(item => 
        item.accessionNumber.toLowerCase().includes(filters.accessionNumber.toLowerCase())
      );
    }

    if (filters.physician) {
      filtered = filtered.filter(item => 
        item.performingPhysician.toLowerCase().includes(filters.physician.toLowerCase()) ||
        item.referringPhysician.toLowerCase().includes(filters.physician.toLowerCase())
      );
    }

    if (filters.bodyPart) {
      filtered = filtered.filter(item => 
        item.bodyPart.toLowerCase().includes(filters.bodyPart.toLowerCase())
      );
    }

    setFilteredItems(filtered);
  }, [worklistItems, filters]);

  // Load data on mount
  useEffect(() => {
    loadWorklist();
  }, [loadWorklist]);

  // Status badge color
  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'SCHEDULED': return 'bg-blue-100 text-blue-800';
      case 'IN_PROGRESS': return 'bg-yellow-100 text-yellow-800';
      case 'COMPLETED': return 'bg-green-100 text-green-800';
      case 'CANCELLED': return 'bg-red-100 text-red-800';
      case 'NO_SHOW': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Priority badge color
  const getPriorityBadgeColor = (priority: string) => {
    switch (priority) {
      case 'STAT': return 'bg-red-100 text-red-800';
      case 'URGENT': return 'bg-orange-100 text-orange-800';
      case 'HIGH': return 'bg-yellow-100 text-yellow-800';
      case 'ROUTINE': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Update item status
  const updateItemStatus = async (itemId: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/worklist/${itemId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      
      if (!response.ok) throw new Error('Failed to update status');
      
      setWorklistItems(prev => 
        prev.map(item => 
          item.id === itemId ? { ...item, studyStatus: newStatus as any } : item
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update status');
    }
  };

  // Bulk operations
  const handleBulkStatusUpdate = async (status: string) => {
    try {
      const response = await fetch('/api/worklist/bulk-update', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemIds: selectedItems, status })
      });
      
      if (!response.ok) throw new Error('Failed to update items');
      
      setWorklistItems(prev => 
        prev.map(item => 
          selectedItems.includes(item.id) ? { ...item, studyStatus: status as any } : item
        )
      );
      setSelectedItems([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update items');
    }
  };

  // Export worklist
  const exportWorklist = async (format: 'csv' | 'pdf' | 'excel') => {
    try {
      const response = await fetch(`/api/worklist/export?format=${format}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: selectedItems.length > 0 ? selectedItems : filteredItems.map(i => i.id) })
      });
      
      if (!response.ok) throw new Error('Failed to export');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `worklist_${new Date().toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export');
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Worklist Management</h1>
          <p className="text-gray-600 mt-1">Manage DICOM studies and patient scheduling</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowFilters(!showFilters)} variant="outline">
            <Filter className="w-4 h-4 mr-2" />
            Filters
          </Button>
          <Button onClick={loadWorklist} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={() => setShowNewItemDialog(true)}>
            <Plus className="w-4 h-4 mr-2" />
            New Study
          </Button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Studies</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
                <FileText className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">In Progress</p>
                  <p className="text-2xl font-bold">{stats.inProgress}</p>
                </div>
                <Play className="w-8 h-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Completed</p>
                  <p className="text-2xl font-bold">{stats.completed}</p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Completion Rate</p>
                  <p className="text-2xl font-bold">{stats.completionRate.toFixed(1)}%</p>
                </div>
                <Progress value={stats.completionRate} className="w-8" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters Panel */}
      {showFilters && (
        <Card>
          <CardHeader>
            <CardTitle>Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
              <div>
                <Label>Date Range</Label>
                <div className="flex gap-2">
                  <DatePicker
                    selected={filters.dateRange.start}
                    onChange={(date) => setFilters(prev => ({
                      ...prev,
                      dateRange: { ...prev.dateRange, start: date }
                    }))}
                    placeholderText="Start date"
                  />
                  <DatePicker
                    selected={filters.dateRange.end}
                    onChange={(date) => setFilters(prev => ({
                      ...prev,
                      dateRange: { ...prev.dateRange, end: date }
                    }))}
                    placeholderText="End date"
                  />
                </div>
              </div>
              
              <div>
                <Label>Patient Name</Label>
                <Input
                  placeholder="Search patient..."
                  value={filters.patientName}
                  onChange={(e) => setFilters(prev => ({ ...prev, patientName: e.target.value }))}
                />
              </div>
              
              <div>
                <Label>Accession Number</Label>
                <Input
                  placeholder="Search accession..."
                  value={filters.accessionNumber}
                  onChange={(e) => setFilters(prev => ({ ...prev, accessionNumber: e.target.value }))}
                />
              </div>
              
              <div>
                <Label>Physician</Label>
                <Input
                  placeholder="Search physician..."
                  value={filters.physician}
                  onChange={(e) => setFilters(prev => ({ ...prev, physician: e.target.value }))}
                />
              </div>
            </div>
            
            <div className="flex gap-2 mt-4">
              <Button onClick={() => setFilters({
                dateRange: { start: null, end: null },
                modality: [],
                status: [],
                priority: [],
                physician: '',
                patientName: '',
                accessionNumber: '',
                bodyPart: ''
              })} variant="outline">
                Clear Filters
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Bulk Actions */}
      {selectedItems.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">
                {selectedItems.length} item(s) selected
              </span>
              <div className="flex gap-2">
                <Button onClick={() => handleBulkStatusUpdate('IN_PROGRESS')} size="sm">
                  Start Selected
                </Button>
                <Button onClick={() => handleBulkStatusUpdate('COMPLETED')} size="sm">
                  Complete Selected
                </Button>
                <Button onClick={() => handleBulkStatusUpdate('CANCELLED')} size="sm" variant="destructive">
                  Cancel Selected
                </Button>
                <Button onClick={() => exportWorklist('csv')} size="sm" variant="outline">
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Worklist Table */}
      <Card>
        <CardHeader>
          <CardTitle>Worklist ({filteredItems.length} studies)</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <RefreshCw className="w-6 h-6 animate-spin" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedItems.length === filteredItems.length && filteredItems.length > 0}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedItems(filteredItems.map(item => item.id));
                        } else {
                          setSelectedItems([]);
                        }
                      }}
                    />
                  </TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead>Accession</TableHead>
                  <TableHead>Study</TableHead>
                  <TableHead>Modality</TableHead>
                  <TableHead>Scheduled</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Physician</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedItems.includes(item.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedItems(prev => [...prev, item.id]);
                          } else {
                            setSelectedItems(prev => prev.filter(id => id !== item.id));
                          }
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{item.patientName}</div>
                        <div className="text-sm text-gray-500">
                          {item.patientId} • {item.patientSex} • {item.patientBirthDate}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm">{item.accessionNumber}</TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{item.studyDescription}</div>
                        <div className="text-sm text-gray-500">{item.bodyPart}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{item.modality}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {new Date(item.scheduledDateTime).toLocaleDateString()}
                        <br />
                        {new Date(item.scheduledDateTime).toLocaleTimeString()}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusBadgeColor(item.studyStatus)}>
                        {item.studyStatus.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={getPriorityBadgeColor(item.priority)}>
                        {item.priority}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div>Perf: {item.performingPhysician}</div>
                        <div className="text-gray-500">Ref: {item.referringPhysician}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button size="sm" variant="ghost">
                                <Eye className="w-4 h-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>View Study</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button size="sm" variant="ghost" onClick={() => setEditingItem(item)}>
                                <Edit className="w-4 h-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Edit Study</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        
                        <Select onValueChange={(value) => updateItemStatus(item.id, value)}>
                          <SelectTrigger className="w-8 h-8 p-0">
                            <MoreHorizontal className="w-4 h-4" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="SCHEDULED">Schedule</SelectItem>
                            <SelectItem value="IN_PROGRESS">Start</SelectItem>
                            <SelectItem value="COMPLETED">Complete</SelectItem>
                            <SelectItem value="CANCELLED">Cancel</SelectItem>
                            <SelectItem value="NO_SHOW">No Show</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default WorklistManagement;
export type { WorklistItem, WorklistFilter, WorklistStats };