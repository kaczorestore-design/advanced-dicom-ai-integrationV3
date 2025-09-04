import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Checkbox } from './ui/checkbox';
import { Label } from './ui/label';
import { ScrollArea } from './ui/scroll-area';
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Grid,
  Layout,
  FileText,
  Save,
  Download,
  Upload,
  Settings,
  Search,
  Filter,
  Sort,
  Calendar,
  Clock,
  User,
  Hospital,
  Stethoscope,
  Brain,
  Heart,
  Bone,
  Eye,
  Zap,
  Target,
  TrendingUp,
  CheckCircle,
  AlertCircle,
  XCircle,
  Star,
  Bookmark,
  Share,
  Print,
  Mail,
  Phone,
  MessageSquare,
  Video,
  Mic,
  Camera,
  Monitor,
  Tablet,
  Smartphone
} from 'lucide-react';

export interface Study {
  id: string;
  patientId: string;
  patientName: string;
  patientAge: number;
  patientSex: 'M' | 'F' | 'O';
  studyDate: Date;
  studyTime: string;
  studyDescription: string;
  modality: string;
  bodyPart: string;
  studyInstanceUID: string;
  accessionNumber: string;
  referringPhysician: string;
  performingPhysician: string;
  institutionName: string;
  seriesCount: number;
  imageCount: number;
  studySize: number;
  priority: 'ROUTINE' | 'URGENT' | 'STAT' | 'HIGH' | 'LOW';
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'REPORTED';
  reportStatus: 'PENDING' | 'PRELIMINARY' | 'FINAL' | 'AMENDED' | 'CANCELLED';
  aiAnalysis?: {
    completed: boolean;
    confidence: number;
    findings: string[];
    recommendations: string[];
  };
  clinicalHistory?: string;
  indication?: string;
  technique?: string;
  comparison?: string;
  findings?: string;
  impression?: string;
  recommendations?: string;
  tags?: string[];
  bookmarked?: boolean;
  starred?: boolean;
  lastViewed?: Date;
  viewCount?: number;
  annotations?: any[];
  measurements?: any[];
}

export interface HangingProtocol {
  id: string;
  name: string;
  description: string;
  modality: string[];
  bodyPart: string[];
  studyDescription: string[];
  layout: {
    rows: number;
    columns: number;
    viewports: ViewportConfig[];
  };
  displaySettings: {
    windowLevel?: { center: number; width: number };
    zoom?: number;
    pan?: { x: number; y: number };
    rotation?: number;
    invert?: boolean;
    interpolation?: 'nearest' | 'linear' | 'cubic';
    colormap?: string;
  };
  sortingRules: {
    primary: 'seriesNumber' | 'acquisitionTime' | 'sliceLocation' | 'instanceNumber';
    secondary?: 'seriesNumber' | 'acquisitionTime' | 'sliceLocation' | 'instanceNumber';
    direction: 'ascending' | 'descending';
  };
  synchronization: {
    enableScrollSync: boolean;
    enableZoomSync: boolean;
    enableWindowLevelSync: boolean;
    enablePanSync: boolean;
  };
  annotations: {
    showMeasurements: boolean;
    showAnnotations: boolean;
    showOverlays: boolean;
    showScaleBar: boolean;
    showOrientation: boolean;
  };
  isDefault: boolean;
  isCustom: boolean;
  createdBy: string;
  createdAt: Date;
  lastModified: Date;
  usageCount: number;
}

export interface ViewportConfig {
  id: string;
  row: number;
  column: number;
  seriesSelector: {
    modality?: string;
    seriesDescription?: string;
    seriesNumber?: number;
    bodyPart?: string;
    sequenceName?: string;
  };
  displaySettings: {
    windowLevel?: { center: number; width: number };
    zoom?: number;
    pan?: { x: number; y: number };
    rotation?: number;
    invert?: boolean;
    mpr?: {
      enabled: boolean;
      orientation: 'axial' | 'coronal' | 'sagittal' | 'oblique';
      thickness?: number;
    };
    rendering?: {
      type: '2d' | '3d' | 'mip' | 'minip' | 'vr';
      quality: 'low' | 'medium' | 'high' | 'ultra';
    };
  };
}

export interface WorklistFilter {
  patientName?: string;
  patientId?: string;
  accessionNumber?: string;
  studyDate?: { from: Date; to: Date };
  modality?: string[];
  bodyPart?: string[];
  priority?: string[];
  status?: string[];
  reportStatus?: string[];
  referringPhysician?: string;
  institutionName?: string;
  studyDescription?: string;
  hasAIAnalysis?: boolean;
  isBookmarked?: boolean;
  isStarred?: boolean;
}

export interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  modality: string[];
  bodyPart: string[];
  template: {
    clinicalHistory: string;
    technique: string;
    findings: string;
    impression: string;
    recommendations: string;
  };
  macros: { [key: string]: string };
  isDefault: boolean;
  createdBy: string;
  createdAt: Date;
  lastModified: Date;
  usageCount: number;
}

export interface ClinicalWorkflowConfig {
  enableAutoHangingProtocols: boolean;
  enableStudyComparison: boolean;
  enableAIIntegration: boolean;
  enableVoiceRecognition: boolean;
  enableTemplateReporting: boolean;
  enableWorklistFiltering: boolean;
  enableStudyRouting: boolean;
  enableQualityAssurance: boolean;
  autoSaveInterval: number;
  defaultHangingProtocol: string;
  defaultReportTemplate: string;
  worklistRefreshInterval: number;
  enableNotifications: boolean;
  enableCollaboration: boolean;
}

export class ClinicalWorkflowManager {
  private studies: Map<string, Study> = new Map();
  private hangingProtocols: Map<string, HangingProtocol> = new Map();
  private reportTemplates: Map<string, ReportTemplate> = new Map();
  private config: ClinicalWorkflowConfig;
  private eventListeners: { [key: string]: Function[] } = {};
  private currentStudy: Study | null = null;
  private currentProtocol: HangingProtocol | null = null;
  private worklistFilters: WorklistFilter = {};
  private isInitialized = false;

  constructor(config: Partial<ClinicalWorkflowConfig> = {}) {
    this.config = {
      enableAutoHangingProtocols: true,
      enableStudyComparison: true,
      enableAIIntegration: true,
      enableVoiceRecognition: false,
      enableTemplateReporting: true,
      enableWorklistFiltering: true,
      enableStudyRouting: true,
      enableQualityAssurance: true,
      autoSaveInterval: 30000, // 30 seconds
      defaultHangingProtocol: 'default',
      defaultReportTemplate: 'general',
      worklistRefreshInterval: 60000, // 1 minute
      enableNotifications: true,
      enableCollaboration: false,
      ...config
    };
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Load default hanging protocols
      await this.loadDefaultHangingProtocols();
      
      // Load default report templates
      await this.loadDefaultReportTemplates();
      
      // Load saved studies and protocols
      await this.loadSavedData();
      
      // Setup auto-save
      if (this.config.autoSaveInterval > 0) {
        this.setupAutoSave();
      }
      
      // Setup worklist refresh
      if (this.config.worklistRefreshInterval > 0) {
        this.setupWorklistRefresh();
      }

      this.isInitialized = true;
      console.log('✅ Clinical Workflow Manager initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize Clinical Workflow Manager:', error);
      throw error;
    }
  }

  private async loadDefaultHangingProtocols(): Promise<void> {
    const defaultProtocols: HangingProtocol[] = [
      {
        id: 'default',
        name: 'Default Single Viewport',
        description: 'Single viewport for general viewing',
        modality: ['CT', 'MR', 'CR', 'DX', 'US', 'NM', 'PT'],
        bodyPart: [],
        studyDescription: [],
        layout: {
          rows: 1,
          columns: 1,
          viewports: [{
            id: 'viewport-1',
            row: 0,
            column: 0,
            seriesSelector: {},
            displaySettings: {
              zoom: 1,
              pan: { x: 0, y: 0 },
              rotation: 0,
              invert: false
            }
          }]
        },
        displaySettings: {
          interpolation: 'linear'
        },
        sortingRules: {
          primary: 'seriesNumber',
          direction: 'ascending'
        },
        synchronization: {
          enableScrollSync: false,
          enableZoomSync: false,
          enableWindowLevelSync: false,
          enablePanSync: false
        },
        annotations: {
          showMeasurements: true,
          showAnnotations: true,
          showOverlays: true,
          showScaleBar: true,
          showOrientation: true
        },
        isDefault: true,
        isCustom: false,
        createdBy: 'system',
        createdAt: new Date(),
        lastModified: new Date(),
        usageCount: 0
      },
      {
        id: 'ct-chest',
        name: 'CT Chest Protocol',
        description: 'Optimized for chest CT studies',
        modality: ['CT'],
        bodyPart: ['CHEST', 'THORAX', 'LUNG'],
        studyDescription: ['CHEST', 'THORAX', 'LUNG', 'PULMONARY'],
        layout: {
          rows: 2,
          columns: 2,
          viewports: [
            {
              id: 'viewport-1',
              row: 0,
              column: 0,
              seriesSelector: { seriesDescription: 'AXIAL' },
              displaySettings: {
                windowLevel: { center: -600, width: 1600 }, // Lung window
                zoom: 1,
                pan: { x: 0, y: 0 }
              }
            },
            {
              id: 'viewport-2',
              row: 0,
              column: 1,
              seriesSelector: { seriesDescription: 'AXIAL' },
              displaySettings: {
                windowLevel: { center: 50, width: 400 }, // Mediastinal window
                zoom: 1,
                pan: { x: 0, y: 0 }
              }
            },
            {
              id: 'viewport-3',
              row: 1,
              column: 0,
              seriesSelector: { seriesDescription: 'CORONAL' },
              displaySettings: {
                windowLevel: { center: -600, width: 1600 },
                zoom: 1,
                pan: { x: 0, y: 0 }
              }
            },
            {
              id: 'viewport-4',
              row: 1,
              column: 1,
              seriesSelector: { seriesDescription: 'SAGITTAL' },
              displaySettings: {
                windowLevel: { center: -600, width: 1600 },
                zoom: 1,
                pan: { x: 0, y: 0 }
              }
            }
          ]
        },
        displaySettings: {
          interpolation: 'linear'
        },
        sortingRules: {
          primary: 'sliceLocation',
          direction: 'ascending'
        },
        synchronization: {
          enableScrollSync: true,
          enableZoomSync: true,
          enableWindowLevelSync: false,
          enablePanSync: true
        },
        annotations: {
          showMeasurements: true,
          showAnnotations: true,
          showOverlays: true,
          showScaleBar: true,
          showOrientation: true
        },
        isDefault: true,
        isCustom: false,
        createdBy: 'system',
        createdAt: new Date(),
        lastModified: new Date(),
        usageCount: 0
      },
      {
        id: 'mr-brain',
        name: 'MR Brain Protocol',
        description: 'Optimized for brain MR studies',
        modality: ['MR'],
        bodyPart: ['BRAIN', 'HEAD'],
        studyDescription: ['BRAIN', 'HEAD', 'NEURO'],
        layout: {
          rows: 2,
          columns: 3,
          viewports: [
            {
              id: 'viewport-1',
              row: 0,
              column: 0,
              seriesSelector: { sequenceName: 'T1' },
              displaySettings: {
                windowLevel: { center: 500, width: 1000 },
                zoom: 1.2,
                pan: { x: 0, y: 0 }
              }
            },
            {
              id: 'viewport-2',
              row: 0,
              column: 1,
              seriesSelector: { sequenceName: 'T2' },
              displaySettings: {
                windowLevel: { center: 500, width: 1000 },
                zoom: 1.2,
                pan: { x: 0, y: 0 }
              }
            },
            {
              id: 'viewport-3',
              row: 0,
              column: 2,
              seriesSelector: { sequenceName: 'FLAIR' },
              displaySettings: {
                windowLevel: { center: 500, width: 1000 },
                zoom: 1.2,
                pan: { x: 0, y: 0 }
              }
            },
            {
              id: 'viewport-4',
              row: 1,
              column: 0,
              seriesSelector: { sequenceName: 'DWI' },
              displaySettings: {
                windowLevel: { center: 500, width: 1000 },
                zoom: 1.2,
                pan: { x: 0, y: 0 }
              }
            },
            {
              id: 'viewport-5',
              row: 1,
              column: 1,
              seriesSelector: { sequenceName: 'ADC' },
              displaySettings: {
                windowLevel: { center: 1000, width: 2000 },
                zoom: 1.2,
                pan: { x: 0, y: 0 }
              }
            },
            {
              id: 'viewport-6',
              row: 1,
              column: 2,
              seriesSelector: { sequenceName: 'T1+C' },
              displaySettings: {
                windowLevel: { center: 500, width: 1000 },
                zoom: 1.2,
                pan: { x: 0, y: 0 }
              }
            }
          ]
        },
        displaySettings: {
          interpolation: 'linear'
        },
        sortingRules: {
          primary: 'sliceLocation',
          direction: 'ascending'
        },
        synchronization: {
          enableScrollSync: true,
          enableZoomSync: true,
          enableWindowLevelSync: false,
          enablePanSync: true
        },
        annotations: {
          showMeasurements: true,
          showAnnotations: true,
          showOverlays: true,
          showScaleBar: true,
          showOrientation: true
        },
        isDefault: true,
        isCustom: false,
        createdBy: 'system',
        createdAt: new Date(),
        lastModified: new Date(),
        usageCount: 0
      }
    ];

    defaultProtocols.forEach(protocol => {
      this.hangingProtocols.set(protocol.id, protocol);
    });
  }

  private async loadDefaultReportTemplates(): Promise<void> {
    const defaultTemplates: ReportTemplate[] = [
      {
        id: 'general',
        name: 'General Report Template',
        description: 'General purpose report template',
        modality: ['CT', 'MR', 'CR', 'DX', 'US', 'NM', 'PT'],
        bodyPart: [],
        template: {
          clinicalHistory: 'Clinical history: ',
          technique: 'Technique: ',
          findings: 'Findings: ',
          impression: 'Impression: ',
          recommendations: 'Recommendations: '
        },
        macros: {
          'normal': 'No acute abnormality detected.',
          'limited': 'Limited study due to patient motion/cooperation.',
          'comparison': 'Comparison with prior study dated [DATE].',
          'followup': 'Recommend follow-up imaging in [TIMEFRAME].'
        },
        isDefault: true,
        createdBy: 'system',
        createdAt: new Date(),
        lastModified: new Date(),
        usageCount: 0
      },
      {
        id: 'ct-chest',
        name: 'CT Chest Report Template',
        description: 'Template for chest CT reports',
        modality: ['CT'],
        bodyPart: ['CHEST', 'THORAX', 'LUNG'],
        template: {
          clinicalHistory: 'Clinical history: ',
          technique: 'Technique: Axial CT images of the chest were obtained without/with intravenous contrast.',
          findings: `Findings:
Lungs: 
Pleura: 
Mediastinum: 
Heart: 
Bones: 
Soft tissues: `,
          impression: 'Impression: ',
          recommendations: 'Recommendations: '
        },
        macros: {
          'clear_lungs': 'The lungs are clear without focal consolidation, pleural effusion, or pneumothorax.',
          'normal_mediastinum': 'The mediastinum is unremarkable.',
          'normal_heart': 'The heart size is normal.',
          'no_pe': 'No evidence of pulmonary embolism.',
          'followup_nodule': 'Recommend follow-up CT in 3-6 months for pulmonary nodule surveillance.'
        },
        isDefault: true,
        createdBy: 'system',
        createdAt: new Date(),
        lastModified: new Date(),
        usageCount: 0
      },
      {
        id: 'mr-brain',
        name: 'MR Brain Report Template',
        description: 'Template for brain MR reports',
        modality: ['MR'],
        bodyPart: ['BRAIN', 'HEAD'],
        template: {
          clinicalHistory: 'Clinical history: ',
          technique: 'Technique: MRI of the brain was performed including T1, T2, FLAIR, and DWI sequences.',
          findings: `Findings:
Brain parenchyma: 
Ventricular system: 
Extra-axial spaces: 
Vascular structures: 
Sinuses: 
Orbits: `,
          impression: 'Impression: ',
          recommendations: 'Recommendations: '
        },
        macros: {
          'normal_brain': 'The brain parenchyma demonstrates normal signal intensity without focal abnormality.',
          'normal_ventricles': 'The ventricular system is normal in size and configuration.',
          'no_mass_effect': 'No mass effect or midline shift.',
          'no_acute_infarct': 'No evidence of acute infarction on DWI.',
          'followup_lesion': 'Recommend follow-up MRI in 3-6 months to assess stability.'
        },
        isDefault: true,
        createdBy: 'system',
        createdAt: new Date(),
        lastModified: new Date(),
        usageCount: 0
      }
    ];

    defaultTemplates.forEach(template => {
      this.reportTemplates.set(template.id, template);
    });
  }

  private async loadSavedData(): Promise<void> {
    try {
      // Load saved hanging protocols
      const savedProtocols = localStorage.getItem('hangingProtocols');
      if (savedProtocols) {
        const protocols = JSON.parse(savedProtocols);
        protocols.forEach((protocol: HangingProtocol) => {
          this.hangingProtocols.set(protocol.id, protocol);
        });
      }

      // Load saved report templates
      const savedTemplates = localStorage.getItem('reportTemplates');
      if (savedTemplates) {
        const templates = JSON.parse(savedTemplates);
        templates.forEach((template: ReportTemplate) => {
          this.reportTemplates.set(template.id, template);
        });
      }

      // Load saved studies
      const savedStudies = localStorage.getItem('clinicalStudies');
      if (savedStudies) {
        const studies = JSON.parse(savedStudies);
        studies.forEach((study: Study) => {
          study.studyDate = new Date(study.studyDate);
          if (study.lastViewed) {
            study.lastViewed = new Date(study.lastViewed);
          }
          this.studies.set(study.id, study);
        });
      }
    } catch (error) {
      console.error('Failed to load saved data:', error);
    }
  }

  private setupAutoSave(): void {
    setInterval(() => {
      this.saveData();
    }, this.config.autoSaveInterval);
  }

  private setupWorklistRefresh(): void {
    setInterval(() => {
      this.refreshWorklist();
    }, this.config.worklistRefreshInterval);
  }

  private async saveData(): Promise<void> {
    try {
      // Save hanging protocols
      const customProtocols = Array.from(this.hangingProtocols.values())
        .filter(p => p.isCustom);
      localStorage.setItem('hangingProtocols', JSON.stringify(customProtocols));

      // Save report templates
      const customTemplates = Array.from(this.reportTemplates.values())
        .filter(t => !t.isDefault);
      localStorage.setItem('reportTemplates', JSON.stringify(customTemplates));

      // Save studies
      const studies = Array.from(this.studies.values());
      localStorage.setItem('clinicalStudies', JSON.stringify(studies));
    } catch (error) {
      console.error('Failed to save data:', error);
    }
  }

  private async refreshWorklist(): Promise<void> {
    try {
      // This would typically fetch from a PACS or worklist server
      // For now, we'll emit an event to notify listeners
      this.emit('worklistRefresh', {
        timestamp: new Date(),
        studyCount: this.studies.size
      });
    } catch (error) {
      console.error('Failed to refresh worklist:', error);
    }
  }

  // Study Management
  public addStudy(study: Study): void {
    this.studies.set(study.id, study);
    this.emit('studyAdded', study);
  }

  public getStudy(id: string): Study | undefined {
    return this.studies.get(id);
  }

  public getStudies(): Study[] {
    return Array.from(this.studies.values());
  }

  public updateStudy(id: string, updates: Partial<Study>): boolean {
    const study = this.studies.get(id);
    if (study) {
      const updatedStudy = { ...study, ...updates };
      this.studies.set(id, updatedStudy);
      this.emit('studyUpdated', updatedStudy);
      return true;
    }
    return false;
  }

  public deleteStudy(id: string): boolean {
    const study = this.studies.get(id);
    if (study) {
      this.studies.delete(id);
      this.emit('studyDeleted', study);
      return true;
    }
    return false;
  }

  public setCurrentStudy(study: Study): void {
    this.currentStudy = study;
    
    // Update view count and last viewed
    study.viewCount = (study.viewCount || 0) + 1;
    study.lastViewed = new Date();
    this.updateStudy(study.id, { viewCount: study.viewCount, lastViewed: study.lastViewed });
    
    // Auto-select hanging protocol if enabled
    if (this.config.enableAutoHangingProtocols) {
      const protocol = this.selectOptimalHangingProtocol(study);
      if (protocol) {
        this.setCurrentProtocol(protocol);
      }
    }
    
    this.emit('currentStudyChanged', study);
  }

  public getCurrentStudy(): Study | null {
    return this.currentStudy;
  }

  // Hanging Protocol Management
  public createHangingProtocol(protocol: Omit<HangingProtocol, 'id' | 'createdAt' | 'lastModified' | 'usageCount'>): HangingProtocol {
    const newProtocol: HangingProtocol = {
      ...protocol,
      id: `protocol-${Date.now()}`,
      createdAt: new Date(),
      lastModified: new Date(),
      usageCount: 0
    };
    
    this.hangingProtocols.set(newProtocol.id, newProtocol);
    this.emit('hangingProtocolCreated', newProtocol);
    
    return newProtocol;
  }

  public getHangingProtocol(id: string): HangingProtocol | undefined {
    return this.hangingProtocols.get(id);
  }

  public getHangingProtocols(): HangingProtocol[] {
    return Array.from(this.hangingProtocols.values());
  }

  public updateHangingProtocol(id: string, updates: Partial<HangingProtocol>): boolean {
    const protocol = this.hangingProtocols.get(id);
    if (protocol) {
      const updatedProtocol = {
        ...protocol,
        ...updates,
        lastModified: new Date()
      };
      this.hangingProtocols.set(id, updatedProtocol);
      this.emit('hangingProtocolUpdated', updatedProtocol);
      return true;
    }
    return false;
  }

  public deleteHangingProtocol(id: string): boolean {
    const protocol = this.hangingProtocols.get(id);
    if (protocol && !protocol.isDefault) {
      this.hangingProtocols.delete(id);
      this.emit('hangingProtocolDeleted', protocol);
      return true;
    }
    return false;
  }

  public setCurrentProtocol(protocol: HangingProtocol): void {
    this.currentProtocol = protocol;
    
    // Update usage count
    protocol.usageCount++;
    this.updateHangingProtocol(protocol.id, { usageCount: protocol.usageCount });
    
    this.emit('currentProtocolChanged', protocol);
  }

  public getCurrentProtocol(): HangingProtocol | null {
    return this.currentProtocol;
  }

  public selectOptimalHangingProtocol(study: Study): HangingProtocol | null {
    const protocols = this.getHangingProtocols();
    
    // Score each protocol based on how well it matches the study
    const scoredProtocols = protocols.map(protocol => {
      let score = 0;
      
      // Modality match
      if (protocol.modality.includes(study.modality)) {
        score += 10;
      }
      
      // Body part match
      if (protocol.bodyPart.some(bp => 
        study.bodyPart.toLowerCase().includes(bp.toLowerCase())
      )) {
        score += 8;
      }
      
      // Study description match
      if (protocol.studyDescription.some(desc => 
        study.studyDescription.toLowerCase().includes(desc.toLowerCase())
      )) {
        score += 6;
      }
      
      // Usage count (popular protocols get slight boost)
      score += Math.min(protocol.usageCount * 0.1, 2);
      
      return { protocol, score };
    });
    
    // Sort by score and return the best match
    scoredProtocols.sort((a, b) => b.score - a.score);
    
    return scoredProtocols.length > 0 && scoredProtocols[0].score > 0 
      ? scoredProtocols[0].protocol 
      : this.hangingProtocols.get(this.config.defaultHangingProtocol) || null;
  }

  // Report Template Management
  public createReportTemplate(template: Omit<ReportTemplate, 'id' | 'createdAt' | 'lastModified' | 'usageCount'>): ReportTemplate {
    const newTemplate: ReportTemplate = {
      ...template,
      id: `template-${Date.now()}`,
      createdAt: new Date(),
      lastModified: new Date(),
      usageCount: 0
    };
    
    this.reportTemplates.set(newTemplate.id, newTemplate);
    this.emit('reportTemplateCreated', newTemplate);
    
    return newTemplate;
  }

  public getReportTemplate(id: string): ReportTemplate | undefined {
    return this.reportTemplates.get(id);
  }

  public getReportTemplates(): ReportTemplate[] {
    return Array.from(this.reportTemplates.values());
  }

  public updateReportTemplate(id: string, updates: Partial<ReportTemplate>): boolean {
    const template = this.reportTemplates.get(id);
    if (template) {
      const updatedTemplate = {
        ...template,
        ...updates,
        lastModified: new Date()
      };
      this.reportTemplates.set(id, updatedTemplate);
      this.emit('reportTemplateUpdated', updatedTemplate);
      return true;
    }
    return false;
  }

  public deleteReportTemplate(id: string): boolean {
    const template = this.reportTemplates.get(id);
    if (template && !template.isDefault) {
      this.reportTemplates.delete(id);
      this.emit('reportTemplateDeleted', template);
      return true;
    }
    return false;
  }

  public selectOptimalReportTemplate(study: Study): ReportTemplate | null {
    const templates = this.getReportTemplates();
    
    // Score each template based on how well it matches the study
    const scoredTemplates = templates.map(template => {
      let score = 0;
      
      // Modality match
      if (template.modality.includes(study.modality)) {
        score += 10;
      }
      
      // Body part match
      if (template.bodyPart.some(bp => 
        study.bodyPart.toLowerCase().includes(bp.toLowerCase())
      )) {
        score += 8;
      }
      
      // Usage count (popular templates get slight boost)
      score += Math.min(template.usageCount * 0.1, 2);
      
      return { template, score };
    });
    
    // Sort by score and return the best match
    scoredTemplates.sort((a, b) => b.score - a.score);
    
    return scoredTemplates.length > 0 && scoredTemplates[0].score > 0 
      ? scoredTemplates[0].template 
      : this.reportTemplates.get(this.config.defaultReportTemplate) || null;
  }

  // Worklist Filtering
  public setWorklistFilters(filters: WorklistFilter): void {
    this.worklistFilters = filters;
    this.emit('worklistFiltersChanged', filters);
  }

  public getWorklistFilters(): WorklistFilter {
    return this.worklistFilters;
  }

  public getFilteredStudies(): Study[] {
    let studies = this.getStudies();
    
    // Apply filters
    if (this.worklistFilters.patientName) {
      const name = this.worklistFilters.patientName.toLowerCase();
      studies = studies.filter(s => s.patientName.toLowerCase().includes(name));
    }
    
    if (this.worklistFilters.patientId) {
      const id = this.worklistFilters.patientId.toLowerCase();
      studies = studies.filter(s => s.patientId.toLowerCase().includes(id));
    }
    
    if (this.worklistFilters.accessionNumber) {
      const acc = this.worklistFilters.accessionNumber.toLowerCase();
      studies = studies.filter(s => s.accessionNumber.toLowerCase().includes(acc));
    }
    
    if (this.worklistFilters.modality && this.worklistFilters.modality.length > 0) {
      studies = studies.filter(s => this.worklistFilters.modality!.includes(s.modality));
    }
    
    if (this.worklistFilters.bodyPart && this.worklistFilters.bodyPart.length > 0) {
      studies = studies.filter(s => 
        this.worklistFilters.bodyPart!.some(bp => 
          s.bodyPart.toLowerCase().includes(bp.toLowerCase())
        )
      );
    }
    
    if (this.worklistFilters.priority && this.worklistFilters.priority.length > 0) {
      studies = studies.filter(s => this.worklistFilters.priority!.includes(s.priority));
    }
    
    if (this.worklistFilters.status && this.worklistFilters.status.length > 0) {
      studies = studies.filter(s => this.worklistFilters.status!.includes(s.status));
    }
    
    if (this.worklistFilters.reportStatus && this.worklistFilters.reportStatus.length > 0) {
      studies = studies.filter(s => this.worklistFilters.reportStatus!.includes(s.reportStatus));
    }
    
    if (this.worklistFilters.studyDate) {
      const { from, to } = this.worklistFilters.studyDate;
      studies = studies.filter(s => {
        const studyDate = new Date(s.studyDate);
        return studyDate >= from && studyDate <= to;
      });
    }
    
    if (this.worklistFilters.hasAIAnalysis !== undefined) {
      studies = studies.filter(s => 
        this.worklistFilters.hasAIAnalysis 
          ? s.aiAnalysis?.completed 
          : !s.aiAnalysis?.completed
      );
    }
    
    if (this.worklistFilters.isBookmarked) {
      studies = studies.filter(s => s.bookmarked);
    }
    
    if (this.worklistFilters.isStarred) {
      studies = studies.filter(s => s.starred);
    }
    
    return studies;
  }

  // Study Navigation
  public getNextStudy(currentStudyId: string): Study | null {
    const studies = this.getFilteredStudies();
    const currentIndex = studies.findIndex(s => s.id === currentStudyId);
    
    if (currentIndex >= 0 && currentIndex < studies.length - 1) {
      return studies[currentIndex + 1];
    }
    
    return null;
  }

  public getPreviousStudy(currentStudyId: string): Study | null {
    const studies = this.getFilteredStudies();
    const currentIndex = studies.findIndex(s => s.id === currentStudyId);
    
    if (currentIndex > 0) {
      return studies[currentIndex - 1];
    }
    
    return null;
  }

  // Study Actions
  public bookmarkStudy(studyId: string): boolean {
    return this.updateStudy(studyId, { bookmarked: true });
  }

  public unbookmarkStudy(studyId: string): boolean {
    return this.updateStudy(studyId, { bookmarked: false });
  }

  public starStudy(studyId: string): boolean {
    return this.updateStudy(studyId, { starred: true });
  }

  public unstarStudy(studyId: string): boolean {
    return this.updateStudy(studyId, { starred: false });
  }

  public addStudyTag(studyId: string, tag: string): boolean {
    const study = this.getStudy(studyId);
    if (study) {
      const tags = study.tags || [];
      if (!tags.includes(tag)) {
        tags.push(tag);
        return this.updateStudy(studyId, { tags });
      }
    }
    return false;
  }

  public removeStudyTag(studyId: string, tag: string): boolean {
    const study = this.getStudy(studyId);
    if (study && study.tags) {
      const tags = study.tags.filter(t => t !== tag);
      return this.updateStudy(studyId, { tags });
    }
    return false;
  }

  // Report Generation
  public generateReport(studyId: string, templateId?: string): string {
    const study = this.getStudy(studyId);
    if (!study) return '';
    
    const template = templateId 
      ? this.getReportTemplate(templateId)
      : this.selectOptimalReportTemplate(study);
    
    if (!template) return '';
    
    // Update template usage count
    template.usageCount++;
    this.updateReportTemplate(template.id, { usageCount: template.usageCount });
    
    // Generate report content
    let report = '';
    
    // Patient information
    report += `Patient: ${study.patientName}\n`;
    report += `Patient ID: ${study.patientId}\n`;
    report += `Age: ${study.patientAge}\n`;
    report += `Sex: ${study.patientSex}\n`;
    report += `Study Date: ${study.studyDate.toLocaleDateString()}\n`;
    report += `Accession Number: ${study.accessionNumber}\n`;
    report += `\n`;
    
    // Template sections
    report += `${template.template.clinicalHistory}${study.clinicalHistory || ''}\n\n`;
    report += `${template.template.technique}\n\n`;
    report += `${template.template.findings}${study.findings || ''}\n\n`;
    report += `${template.template.impression}${study.impression || ''}\n\n`;
    report += `${template.template.recommendations}${study.recommendations || ''}\n\n`;
    
    return report;
  }

  // Event Management
  public on(event: string, callback: Function): void {
    if (!this.eventListeners[event]) {
      this.eventListeners[event] = [];
    }
    this.eventListeners[event].push(callback);
  }

  public off(event: string, callback: Function): void {
    if (this.eventListeners[event]) {
      this.eventListeners[event] = this.eventListeners[event].filter(cb => cb !== callback);
    }
  }

  private emit(event: string, data: any): void {
    if (this.eventListeners[event]) {
      this.eventListeners[event].forEach(callback => callback(data));
    }
  }

  // Configuration
  public updateConfig(updates: Partial<ClinicalWorkflowConfig>): void {
    this.config = { ...this.config, ...updates };
    this.emit('configUpdated', this.config);
  }

  public getConfig(): ClinicalWorkflowConfig {
    return this.config;
  }

  public setNetworkManager(networkManager: any): void {
    console.log('Network manager set for Clinical Workflow Manager');
    // Store reference to network manager for DICOM operations
  }

  // Cleanup
  public destroy(): void {
    this.saveData();
    this.studies.clear();
    this.hangingProtocols.clear();
    this.reportTemplates.clear();
    this.eventListeners = {};
    this.currentStudy = null;
    this.currentProtocol = null;
    this.isInitialized = false;
    
    console.log('✅ Clinical Workflow Manager destroyed');
  }
}

export default ClinicalWorkflowManager;