// Research Analytics Component
// Advanced analysis algorithms for medical research with ML models and statistical tools

import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as Tabs from '@radix-ui/react-tabs';
import * as Dialog from '@radix-ui/react-dialog';
// TODO: Replace Material-UI components with Radix UI equivalents
// Using native HTML elements and Radix UI components instead of Material-UI
import {
  ChevronDown as ExpandMoreIcon,
  Settings as SettingsIcon,
  Eye as VisibilityIcon,
  Download as DownloadIcon,
  Play as PlayIcon
  // TODO: Add more Lucide React icons as needed
  // Biotech as BiotechIcon,
  // Warning as WarningIcon,
  // CheckCircle as CheckCircleIcon,
  // Error as ErrorIcon,
  // Info as InfoIcon,
  // Search as SearchIcon,
  // Compare as CompareIcon,
  // CenterFocusStrong as FocusIcon,
  // Straighten as MeasureIcon
  // TODO: Add these image editing and measurement icons when needed
  // Crop as CropIcon,
  // Contrast as ContrastIcon,
  // Brightness6 as BrightnessIcon,
  // RadioButtonChecked as CircleIcon,
  // CropFree as RectangleIcon,
  // Timeline as LineIcon,
  // MyLocation as PointIcon,
  // Memory as MemoryIcon,
  // Speed as SpeedIcon
  // TODO: Add these analytics and chart icons when needed
  // TrendingUp as TrendingUpIcon,
  // TrendingDown as TrendingDownIcon,
  // BarChart as BarChartIcon,
  // PieChart as PieChartIcon,
  // BubbleChart as BubbleChartIcon,
  // Insights as InsightsIcon,
  // Psychology as PsychologyIcon,
  // ModelTraining as ModelIcon,
  // DataUsage as DataIcon
  // TODO: Add these technical and development icons when needed
  // CloudUpload as CloudUploadIcon,
  // CloudDownload as CloudDownloadIcon,
  // Storage as StorageIcon,
  // Computer as ComputerIcon,
  // Layers as LayersIcon,
  // Transform as TransformIcon,
  // Architecture as ArchitectureIcon,
  // Hub as HubIcon,
  // AccountTree as TreeIcon,
  // Schema as SchemaIcon,
  // Code as CodeIcon,
  // Terminal as TerminalIcon
  // TODO: Add these development and security icons when needed
  // Build as BuildIcon,
  // BugReport as BugIcon,
  // Verified as VerifiedIcon,
  // Security as SecurityIcon,
  // Lock as LockIcon,
  // Public as PublicIcon,
  // Group as GroupIcon,
  // Person as PersonIcon,
  // Share as ShareIcon
  // TODO: Add these file and document icons when needed
  // Link as LinkIcon,
  // ContentCopy as CopyIcon,
  // FileDownload as FileDownloadIcon,
  // FileUpload as FileUploadIcon,
  // Folder as FolderIcon,
  // FolderOpen as FolderOpenIcon,
  // Description as DescriptionIcon,
  // Article as ArticleIcon,
  // MenuBook as BookIcon
  // TODO: Add these education and rating icons when needed
  // School as SchoolIcon,
  // LibraryBooks as LibraryIcon,
  // Quiz as QuizIcon,
  // Assignment as AssignmentIcon,
  // Grade as GradeIcon,
  // Star as StarIcon,
  // StarBorder as StarBorderIcon,
  // Favorite as FavoriteIcon,
  // FavoriteBorder as FavoriteBorderIcon
  // TODO: Add these bookmark and organization icons when needed
  // Bookmark as BookmarkIcon,
  // BookmarkBorder as BookmarkBorderIcon,
  // Flag as FlagIcon,
  // Label as LabelIcon,
  // Tag as TagIcon,
  // Category as CategoryIcon,
  // Class as ClassIcon,
  // Extension as ExtensionIcon,
  // Apps as AppsIcon
  // TODO: Add these view and layout icons when needed
  // Dashboard as DashboardIcon,
  // ViewModule as ModuleIcon,
  // ViewList as ListIcon,
  // ViewComfy as ComfyIcon,
  // ViewCompact as CompactIcon,
  // ViewArray as ArrayIcon,
  // ViewColumn as ColumnIcon,
  // ViewStream as StreamIcon,
  // ViewCarousel as CarouselIcon
  // TODO: Add these calendar and time icons when needed
  // ViewDay as DayIcon,
  // ViewWeek as WeekIcon,
  // ViewAgenda as AgendaIcon,
  // CalendarToday as CalendarIcon,
  // Schedule as ScheduleIcon,
  // AccessTime as TimeIcon,
  // Timer as TimerIcon,
  // Timelapse as TimelapseIcon,
  // Update as UpdateIcon
  // TODO: Add these history, sync, and media control icons when needed
  // History as HistoryIcon,
  // Restore as RestoreIcon,
  // Backup as BackupIcon,
  // Sync as SyncIcon,
  // SyncAlt as SyncAltIcon,
  // Loop as LoopIcon,
  // Repeat as RepeatIcon,
  // RepeatOne as RepeatOneIcon,
  // Shuffle as ShuffleIcon
  // TODO: Add these media control and communication icons when needed
  // SkipNext as SkipNextIcon,
  // SkipPrevious as SkipPreviousIcon,
  // FastForward as FastForwardIcon,
  // FastRewind as FastRewindIcon,
  // Forward as ForwardIcon,
  // Reply as ReplyIcon,
  // ReplyAll as ReplyAllIcon,
  // Send as SendIcon,
  // Mail as MailIcon
  // TODO: Add these communication and help icons when needed
  // Message as MessageIcon,
  // Chat as ChatIcon,
  // Comment as CommentIcon,
  // Forum as ForumIcon,
  // Feedback as FeedbackIcon,
  // ContactSupport as SupportIcon,
  // Help as HelpIcon,
  // HelpOutline as HelpOutlineIcon,
  // LiveHelp as LiveHelpIcon,
  // ContactMail as ContactIcon
  // TODO: Add these phone call icons when needed
  // Phone as PhoneIcon,
  // PhoneInTalk as PhoneInTalkIcon,
  // VideoCall as VideoCallIcon,
  // Call as CallIcon,
  // CallEnd as CallEndIcon,
  // CallMade as CallMadeIcon,
  // CallReceived as CallReceivedIcon,
  // CallMissed as CallMissedIcon,
  // CallMissedOutgoing as CallMissedOutgoingIcon
  // TODO: Add these voice and microphone icons when needed
  // Voicemail as VoicemailIcon,
  // VoiceOverOff as VoiceOverOffIcon,
  // RecordVoiceOver as RecordVoiceOverIcon,
  // Mic as MicIcon,
  // MicOff as MicOffIcon,
  // MicNone as MicNoneIcon,
  // MicExternalOn as MicExternalOnIcon,
  // MicExternalOff as MicExternalOffIcon,
  // Hearing as HearingIcon,
  // HearingDisabled as HearingDisabledIcon
  // TODO: Add these audio and music icons when needed
  // VolumeUp as VolumeUpIcon,
  // VolumeDown as VolumeDownIcon,
  // VolumeMute as VolumeMuteIcon,
  // VolumeOff as VolumeOffIcon,
  // Surround as SurroundIcon,
  // SurroundSound as SurroundSoundIcon,
  // AudioFile as AudioFileIcon,
  // AudioTrack as AudioTrackIcon,
  // MusicNote as MusicNoteIcon,
  // MusicVideo as MusicVideoIcon,
  // Album as AlbumIcon,
  // ArtTrack as ArtTrackIcon
  // TODO: Add these movie and video icons when needed
  // Movie as MovieIcon,
  // MovieCreation as MovieCreationIcon,
  // MovieFilter as MovieFilterIcon,
  // Theaters as TheatersIcon,
  // LocalMovies as LocalMoviesIcon,
  // Video as VideoIcon,
  // VideoLibrary as VideoLibraryIcon,
  // VideoSettings as VideoSettingsIcon
  // TODO: Add these video and quality icons when needed
  // Videocam as VideocamIcon,
  // VideocamOff as VideocamOffIcon,
  // VideoLabel as VideoLabelIcon,
  // SlowMotionVideo as SlowMotionVideoIcon,
  // HighQuality as HighQualityIcon,
  // Hd as HdIcon,
  // FourK as FourKIcon,
  // SixK as SixKIcon,
  // EightK as EightKIcon
  // TODO: Add these icons when needed
  // TenK as TenKIcon,
  // SixteenMp as SixteenMpIcon,
  // TwentyMp as TwentyMpIcon,
  // TwentyOneMp as TwentyOneMpIcon,
  // TwentyTwoMp as TwentyTwoMpIcon,
  // TwentyThreeMp as TwentyThreeMpIcon,
  // TwentyFourMp as TwentyFourMpIcon
} from 'lucide-react';

// Research Data Structures
interface ResearchProject {
  id: string;
  name: string;
  description: string;
  principal_investigator: string;
  institution: string;
  created_date: string;
  status: 'active' | 'completed' | 'paused' | 'cancelled';
  datasets: Dataset[];
  analyses: Analysis[];
  models: MLModel[];
  publications: Publication[];
  collaborators: Collaborator[];
  ethics_approval: EthicsApproval;
  funding: FundingInfo;
}

interface Dataset {
  id: string;
  name: string;
  description: string;
  modality: string[];
  patient_count: number;
  image_count: number;
  size_gb: number;
  acquisition_period: {
    start: string;
    end: string;
  };
  demographics: Demographics;
  inclusion_criteria: string[];
  exclusion_criteria: string[];
  annotations: AnnotationSet[];
  quality_metrics: QualityMetrics;
  data_splits: DataSplit;
  privacy_level: 'public' | 'restricted' | 'private';
}

interface Demographics {
  age_range: [number, number];
  age_mean: number;
  age_std: number;
  gender_distribution: {
    male: number;
    female: number;
    other: number;
  };
  ethnicity_distribution: { [key: string]: number };
  comorbidities: { [key: string]: number };
}

interface AnnotationSet {
  id: string;
  name: string;
  type: 'segmentation' | 'classification' | 'detection' | 'landmark' | 'measurement';
  annotator: string;
  annotation_date: string;
  quality_score: number;
  inter_rater_agreement?: number;
  validation_status: 'pending' | 'validated' | 'rejected';
  annotation_count: number;
  class_distribution: { [key: string]: number };
}

interface QualityMetrics {
  image_quality_score: number;
  motion_artifacts: number;
  noise_level: number;
  contrast_score: number;
  resolution_adequacy: number;
  protocol_compliance: number;
  missing_data_percentage: number;
}

interface DataSplit {
  training: number; // percentage
  validation: number;
  testing: number;
  stratification_method: 'random' | 'patient_based' | 'institution_based' | 'temporal';
  cross_validation_folds?: number;
}

interface Analysis {
  id: string;
  name: string;
  type: 'statistical' | 'machine_learning' | 'deep_learning' | 'radiomics' | 'morphometry';
  description: string;
  dataset_ids: string[];
  parameters: AnalysisParameters;
  results: AnalysisResults;
  status: 'pending' | 'running' | 'completed' | 'failed';
  created_date: string;
  completion_date?: string;
  execution_time?: number; // seconds
  computational_resources: ComputationalResources;
}

interface AnalysisParameters {
  preprocessing: PreprocessingParams;
  feature_extraction: FeatureExtractionParams;
  model_config: ModelConfig;
  validation_strategy: ValidationStrategy;
  hyperparameters: { [key: string]: any };
}

interface PreprocessingParams {
  normalization: {
    method: 'z_score' | 'min_max' | 'robust' | 'quantile';
    parameters: { [key: string]: number };
  };
  resampling: {
    target_spacing: [number, number, number];
    interpolation: 'linear' | 'nearest' | 'cubic';
  };
  augmentation: {
    enabled: boolean;
    rotation_range: number;
    translation_range: number;
    scaling_range: number;
    noise_level: number;
    elastic_deformation: boolean;
  };
  filtering: {
    gaussian_sigma: number;
    median_kernel_size: number;
    bilateral_parameters: { [key: string]: number };
  };
}

interface FeatureExtractionParams {
  radiomics: {
    enabled: boolean;
    feature_classes: string[];
    bin_width: number;
    voxel_array_shift: number;
    normalize: boolean;
  };
  deep_features: {
    enabled: boolean;
    pretrained_model: string;
    layer_name: string;
    fine_tuning: boolean;
  };
  morphometric: {
    enabled: boolean;
    measurements: string[];
    coordinate_system: 'native' | 'standard';
  };
  texture: {
    enabled: boolean;
    methods: string[];
    parameters: { [key: string]: any };
  };
}

interface ModelConfig {
  algorithm: string;
  architecture?: string;
  loss_function: string;
  optimizer: string;
  learning_rate: number;
  batch_size: number;
  epochs: number;
  early_stopping: {
    enabled: boolean;
    patience: number;
    monitor: string;
  };
  regularization: {
    l1: number;
    l2: number;
    dropout: number;
  };
}

interface ValidationStrategy {
  method: 'holdout' | 'k_fold' | 'stratified_k_fold' | 'leave_one_out' | 'bootstrap';
  folds?: number;
  test_size?: number;
  random_state: number;
  stratify: boolean;
}

interface ComputationalResources {
  cpu_cores: number;
  memory_gb: number;
  gpu_count: number;
  gpu_memory_gb: number;
  storage_gb: number;
  execution_environment: 'local' | 'cloud' | 'hpc';
}

interface AnalysisResults {
  metrics: PerformanceMetrics;
  feature_importance: FeatureImportance[];
  predictions: Prediction[];
  visualizations: Visualization[];
  statistical_tests: StatisticalTest[];
  model_artifacts: ModelArtifact[];
  reports: Report[];
}

interface PerformanceMetrics {
  accuracy?: number;
  precision?: number;
  recall?: number;
  f1_score?: number;
  auc_roc?: number;
  auc_pr?: number;
  sensitivity?: number;
  specificity?: number;
  mse?: number;
  mae?: number;
  r_squared?: number;
  dice_coefficient?: number;
  hausdorff_distance?: number;
  confusion_matrix?: number[][];
  classification_report?: { [key: string]: any };
}

interface FeatureImportance {
  feature_name: string;
  importance_score: number;
  p_value?: number;
  confidence_interval?: [number, number];
  method: 'permutation' | 'shap' | 'lime' | 'gradient' | 'statistical';
}

interface Prediction {
  sample_id: string;
  ground_truth?: any;
  prediction: any;
  confidence: number;
  explanation?: any;
  uncertainty?: number;
}

interface Visualization {
  id: string;
  type: 'roc_curve' | 'pr_curve' | 'confusion_matrix' | 'feature_importance' | 'learning_curve' | 'tsne' | 'umap' | 'heatmap';
  title: string;
  data: any;
  config: any;
}

interface StatisticalTest {
  test_name: string;
  statistic: number;
  p_value: number;
  effect_size?: number;
  confidence_interval?: [number, number];
  interpretation: string;
}

interface ModelArtifact {
  type: 'model_weights' | 'feature_extractor' | 'preprocessor' | 'scaler' | 'encoder';
  file_path: string;
  size_mb: number;
  checksum: string;
  metadata: { [key: string]: any };
}

interface Report {
  type: 'analysis_summary' | 'model_performance' | 'feature_analysis' | 'statistical_report';
  format: 'pdf' | 'html' | 'markdown' | 'jupyter';
  file_path: string;
  generated_date: string;
}

interface MLModel {
  id: string;
  name: string;
  type: 'classification' | 'regression' | 'segmentation' | 'detection' | 'generation';
  architecture: string;
  framework: 'tensorflow' | 'pytorch' | 'scikit_learn' | 'xgboost' | 'lightgbm';
  version: string;
  training_dataset_id: string;
  performance_metrics: PerformanceMetrics;
  deployment_status: 'development' | 'testing' | 'production' | 'deprecated';
  model_size_mb: number;
  inference_time_ms: number;
  hardware_requirements: ComputationalResources;
  api_endpoint?: string;
  documentation: string;
  license: string;
}

interface Publication {
  id: string;
  title: string;
  authors: string[];
  journal: string;
  publication_date: string;
  doi?: string;
  pmid?: string;
  abstract: string;
  keywords: string[];
  impact_factor?: number;
  citation_count?: number;
  open_access: boolean;
  related_analyses: string[];
  related_datasets: string[];
}

interface Collaborator {
  id: string;
  name: string;
  email: string;
  institution: string;
  role: 'principal_investigator' | 'co_investigator' | 'research_assistant' | 'data_analyst' | 'clinician';
  permissions: string[];
  contribution: string;
}

interface EthicsApproval {
  irb_number: string;
  institution: string;
  approval_date: string;
  expiration_date: string;
  status: 'approved' | 'pending' | 'expired' | 'denied';
  conditions: string[];
  amendments: Amendment[];
}

interface Amendment {
  id: string;
  description: string;
  approval_date: string;
  status: 'approved' | 'pending' | 'denied';
}

interface FundingInfo {
  agency: string;
  grant_number: string;
  amount: number;
  currency: string;
  start_date: string;
  end_date: string;
  status: 'active' | 'completed' | 'pending';
}

const ResearchAnalytics: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [project, setProject] = useState<ResearchProject | null>(null);
  const [selectedDataset, setSelectedDataset] = useState<string | null>(null);
  const [selectedAnalysis, setSelectedAnalysis] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  const [analysisConfig, setAnalysisConfig] = useState<AnalysisParameters>({
    preprocessing: {
      normalization: {
        method: 'z_score',
        parameters: { mean: 0, std: 1 }
      },
      resampling: {
        target_spacing: [1.0, 1.0, 1.0],
        interpolation: 'linear'
      },
      augmentation: {
        enabled: true,
        rotation_range: 15,
        translation_range: 0.1,
        scaling_range: 0.1,
        noise_level: 0.05,
        elastic_deformation: false
      },
      filtering: {
        gaussian_sigma: 1.0,
        median_kernel_size: 3,
        bilateral_parameters: { sigma_color: 75, sigma_space: 75 }
      }
    },
    feature_extraction: {
      radiomics: {
        enabled: true,
        feature_classes: ['firstorder', 'shape', 'glcm', 'glrlm', 'glszm'],
        bin_width: 25,
        voxel_array_shift: 300,
        normalize: true
      },
      deep_features: {
        enabled: true,
        pretrained_model: 'ResNet50',
        layer_name: 'avg_pool',
        fine_tuning: false
      },
      morphometric: {
        enabled: false,
        measurements: ['volume', 'surface_area', 'sphericity'],
        coordinate_system: 'native'
      },
      texture: {
        enabled: true,
        methods: ['lbp', 'glcm', 'laws'],
        parameters: { radius: 3, n_points: 24 }
      }
    },
    model_config: {
      algorithm: 'random_forest',
      loss_function: 'cross_entropy',
      optimizer: 'adam',
      learning_rate: 0.001,
      batch_size: 32,
      epochs: 100,
      early_stopping: {
        enabled: true,
        patience: 10,
        monitor: 'val_loss'
      },
      regularization: {
        l1: 0.0,
        l2: 0.001,
        dropout: 0.2
      }
    },
    validation_strategy: {
      method: 'stratified_k_fold',
      folds: 5,
      random_state: 42,
      stratify: true
    },
    hyperparameters: {
      n_estimators: 100,
      max_depth: 10,
      min_samples_split: 2,
      min_samples_leaf: 1
    }
  });
  const [isRunningAnalysis, setIsRunningAnalysis] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [showConfigDialog, setShowConfigDialog] = useState(false);

  const [selectedVisualization, setSelectedVisualization] = useState<string | null>(null);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Initialize with sample research project
  useEffect(() => {
    const sampleProject: ResearchProject = {
      id: 'research_001',
      name: 'AI-Powered Lung Cancer Detection',
      description: 'Development of deep learning models for early detection of lung cancer in CT scans',
      principal_investigator: 'Dr. Sarah Johnson',
      institution: 'Medical AI Research Institute',
      created_date: '2024-01-01',
      status: 'active',
      datasets: [
        {
          id: 'dataset_001',
          name: 'LIDC-IDRI Extended',
          description: 'Extended LIDC-IDRI dataset with additional annotations',
          modality: ['CT'],
          patient_count: 1018,
          image_count: 244527,
          size_gb: 124.5,
          acquisition_period: {
            start: '2020-01-01',
            end: '2023-12-31'
          },
          demographics: {
            age_range: [25, 87],
            age_mean: 61.2,
            age_std: 12.8,
            gender_distribution: {
              male: 515,
              female: 503,
              other: 0
            },
            ethnicity_distribution: {
              'Caucasian': 0.72,
              'African American': 0.15,
              'Hispanic': 0.08,
              'Asian': 0.04,
              'Other': 0.01
            },
            comorbidities: {
              'COPD': 0.35,
              'Smoking History': 0.78,
              'Diabetes': 0.22,
              'Hypertension': 0.45
            }
          },
          inclusion_criteria: [
            'Age >= 18 years',
            'CT scan with slice thickness <= 2.5mm',
            'Complete clinical history available'
          ],
          exclusion_criteria: [
            'Previous lung surgery',
            'Active chemotherapy',
            'Severe motion artifacts'
          ],
          annotations: [
            {
              id: 'ann_001',
              name: 'Nodule Segmentations',
              type: 'segmentation',
              annotator: 'Expert Radiologist Panel',
              annotation_date: '2024-01-15',
              quality_score: 0.92,
              inter_rater_agreement: 0.87,
              validation_status: 'validated',
              annotation_count: 2635,
              class_distribution: {
                'benign': 0.68,
                'malignant': 0.32
              }
            },
            {
              id: 'ann_002',
              name: 'Malignancy Classification',
              type: 'classification',
              annotator: 'AI-Assisted Review',
              annotation_date: '2024-02-01',
              quality_score: 0.89,
              validation_status: 'validated',
              annotation_count: 2635,
              class_distribution: {
                'category_1': 0.15,
                'category_2': 0.25,
                'category_3': 0.28,
                'category_4': 0.22,
                'category_5': 0.10
              }
            }
          ],
          quality_metrics: {
            image_quality_score: 0.88,
            motion_artifacts: 0.05,
            noise_level: 0.12,
            contrast_score: 0.85,
            resolution_adequacy: 0.92,
            protocol_compliance: 0.96,
            missing_data_percentage: 0.03
          },
          data_splits: {
            training: 70,
            validation: 15,
            testing: 15,
            stratification_method: 'patient_based',
            cross_validation_folds: 5
          },
          privacy_level: 'restricted'
        }
      ],
      analyses: [
        {
          id: 'analysis_001',
          name: 'Radiomics-based Classification',
          type: 'machine_learning',
          description: 'Random Forest classifier using radiomics features',
          dataset_ids: ['dataset_001'],
          parameters: analysisConfig,
          results: {
            metrics: {
              accuracy: 0.87,
              precision: 0.84,
              recall: 0.89,
              f1_score: 0.86,
              auc_roc: 0.92,
              auc_pr: 0.88,
              sensitivity: 0.89,
              specificity: 0.85,
              confusion_matrix: [[425, 78], [56, 459]]
            },
            feature_importance: [
              {
                feature_name: 'firstorder_Mean',
                importance_score: 0.15,
                p_value: 0.001,
                confidence_interval: [0.12, 0.18],
                method: 'permutation'
              },
              {
                feature_name: 'shape_Sphericity',
                importance_score: 0.12,
                p_value: 0.003,
                confidence_interval: [0.09, 0.15],
                method: 'permutation'
              },
              {
                feature_name: 'glcm_Contrast',
                importance_score: 0.11,
                p_value: 0.005,
                confidence_interval: [0.08, 0.14],
                method: 'permutation'
              }
            ],
            predictions: [],
            visualizations: [
              {
                id: 'viz_001',
                type: 'roc_curve',
                title: 'ROC Curve - Malignancy Classification',
                data: { fpr: [0, 0.15, 1], tpr: [0, 0.89, 1], auc: 0.92 },
                config: { color: '#1976d2', lineWidth: 2 }
              },
              {
                id: 'viz_002',
                type: 'feature_importance',
                title: 'Top 20 Most Important Features',
                data: { features: [], importance: [] },
                config: { orientation: 'horizontal' }
              }
            ],
            statistical_tests: [
              {
                test_name: 'Mann-Whitney U Test',
                statistic: 156789.5,
                p_value: 0.001,
                effect_size: 0.72,
                interpretation: 'Significant difference between benign and malignant groups'
              }
            ],
            model_artifacts: [
              {
                type: 'model_weights',
                file_path: '/models/rf_classifier.pkl',
                size_mb: 12.5,
                checksum: 'sha256:abc123...',
                metadata: { sklearn_version: '1.3.0', feature_count: 107 }
              }
            ],
            reports: [
              {
                type: 'analysis_summary',
                format: 'pdf',
                file_path: '/reports/analysis_001_summary.pdf',
                generated_date: '2024-01-20'
              }
            ]
          },
          status: 'completed',
          created_date: '2024-01-15',
          completion_date: '2024-01-20',
          execution_time: 3600,
          computational_resources: {
            cpu_cores: 16,
            memory_gb: 64,
            gpu_count: 1,
            gpu_memory_gb: 24,
            storage_gb: 500,
            execution_environment: 'hpc'
          }
        }
      ],
      models: [
        {
          id: 'model_001',
          name: 'LungNet-v2.1',
          type: 'classification',
          architecture: 'ResNet50 + Custom Head',
          framework: 'tensorflow',
          version: '2.1.0',
          training_dataset_id: 'dataset_001',
          performance_metrics: {
            accuracy: 0.91,
            precision: 0.88,
            recall: 0.93,
            f1_score: 0.90,
            auc_roc: 0.95,
            sensitivity: 0.93,
            specificity: 0.89
          },
          deployment_status: 'production',
          model_size_mb: 98.7,
          inference_time_ms: 45,
          hardware_requirements: {
            cpu_cores: 4,
            memory_gb: 8,
            gpu_count: 1,
            gpu_memory_gb: 6,
            storage_gb: 10,
            execution_environment: 'cloud'
          },
          api_endpoint: 'https://api.lungnet.ai/v2/predict',
          documentation: 'https://docs.lungnet.ai/v2',
          license: 'MIT'
        }
      ],
      publications: [
        {
          id: 'pub_001',
          title: 'Deep Learning for Early Lung Cancer Detection: A Multi-Center Validation Study',
          authors: ['Johnson, S.', 'Smith, M.', 'Brown, K.', 'Davis, L.'],
          journal: 'Nature Medicine',
          publication_date: '2024-03-15',
          doi: '10.1038/s41591-024-12345',
          pmid: '38123456',
          abstract: 'We developed and validated a deep learning model for early lung cancer detection...',
          keywords: ['lung cancer', 'deep learning', 'CT imaging', 'early detection'],
          impact_factor: 87.241,
          citation_count: 15,
          open_access: true,
          related_analyses: ['analysis_001'],
          related_datasets: ['dataset_001']
        }
      ],
      collaborators: [
        {
          id: 'collab_001',
          name: 'Dr. Michael Smith',
          email: 'msmith@hospital.edu',
          institution: 'City General Hospital',
          role: 'co_investigator',
          permissions: ['data_access', 'analysis_review'],
          contribution: 'Clinical expertise and data collection'
        }
      ],
      ethics_approval: {
        irb_number: 'IRB-2024-001',
        institution: 'Medical AI Research Institute',
        approval_date: '2024-01-01',
        expiration_date: '2025-01-01',
        status: 'approved',
        conditions: ['Annual progress reports required', 'Data anonymization mandatory'],
        amendments: []
      },
      funding: {
        agency: 'National Institutes of Health',
        grant_number: 'R01-CA123456',
        amount: 2500000,
        currency: 'USD',
        start_date: '2024-01-01',
        end_date: '2026-12-31',
        status: 'active'
      }
    };
    
    setProject(sampleProject);
    setSelectedDataset('dataset_001');
    setSelectedAnalysis('analysis_001');
    setSelectedModel('model_001');
  }, [analysisConfig]);

  // Analysis execution functions
  const runAnalysis = useCallback(async () => {
    if (!project || !selectedDataset) return;
    
    setIsRunningAnalysis(true);
    setAnalysisProgress(0);
    
    const steps = [
      'Loading dataset...',
      'Preprocessing images...',
      'Extracting features...',
      'Training model...',
      'Validating results...',
      'Computing metrics...',
      'Generating visualizations...',
      'Creating report...'
    ];
    
    for (let i = 0; i < steps.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      setAnalysisProgress(((i + 1) / steps.length) * 100);
    }
    
    // Simulate creating new analysis
    const newAnalysis: Analysis = {
      id: `analysis_${Date.now()}`,
      name: `Analysis ${project.analyses.length + 1}`,
      type: 'machine_learning',
      description: 'Automated analysis run',
      dataset_ids: [selectedDataset],
      parameters: analysisConfig,
      results: {
        metrics: {
          accuracy: 0.85 + Math.random() * 0.1,
          precision: 0.82 + Math.random() * 0.1,
          recall: 0.87 + Math.random() * 0.1,
          f1_score: 0.84 + Math.random() * 0.1,
          auc_roc: 0.90 + Math.random() * 0.08
        },
        feature_importance: [],
        predictions: [],
        visualizations: [],
        statistical_tests: [],
        model_artifacts: [],
        reports: []
      },
      status: 'completed',
      created_date: new Date().toISOString(),
      completion_date: new Date().toISOString(),
      execution_time: Math.floor(Math.random() * 3600) + 1800,
      computational_resources: {
        cpu_cores: 16,
        memory_gb: 64,
        gpu_count: 1,
        gpu_memory_gb: 24,
        storage_gb: 500,
        execution_environment: 'hpc'
      }
    };
    
    setProject(prev => prev ? {
      ...prev,
      analyses: [...prev.analyses, newAnalysis]
    } : null);
    
    setIsRunningAnalysis(false);
  }, [project, selectedDataset, analysisConfig]);

  // Visualization functions
  const drawVisualization = useCallback((type: string) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const width = canvas.width;
    const height = canvas.height;
    
    ctx.clearRect(0, 0, width, height);
    
    switch (type) {
      case 'roc_curve':
        // Draw ROC curve
        ctx.strokeStyle = '#1976d2';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(50, height - 50);
        ctx.quadraticCurveTo(100, height - 200, width - 50, 50);
        ctx.stroke();
        
        // Draw diagonal reference line
        ctx.strokeStyle = '#ccc';
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(50, height - 50);
        ctx.lineTo(width - 50, 50);
        ctx.stroke();
        ctx.setLineDash([]);
        
        // Labels
        ctx.fillStyle = '#333';
        ctx.font = '12px Arial';
        ctx.fillText('False Positive Rate', width / 2 - 50, height - 10);
        ctx.save();
        ctx.translate(15, height / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.fillText('True Positive Rate', -50, 0);
        ctx.restore();
        break;
        
      case 'feature_importance':
        // Draw feature importance bar chart
        const features = ['Feature 1', 'Feature 2', 'Feature 3', 'Feature 4', 'Feature 5'];
        const importance = [0.25, 0.20, 0.18, 0.15, 0.12];
        const barHeight = (height - 100) / features.length;
        
        features.forEach((feature, i) => {
          const barWidth = (importance[i] * (width - 150));
          const y = 50 + i * barHeight;
          
          // Draw bar
          ctx.fillStyle = `hsl(${210 + i * 30}, 70%, 50%)`;
          ctx.fillRect(100, y, barWidth, barHeight - 10);
          
          // Draw feature name
          ctx.fillStyle = '#333';
          ctx.font = '11px Arial';
          ctx.textAlign = 'right';
          ctx.fillText(feature, 95, y + barHeight / 2 + 3);
          
          // Draw importance value
          ctx.textAlign = 'left';
          ctx.fillText(importance[i].toFixed(2), 105 + barWidth, y + barHeight / 2 + 3);
        });
        break;
        
      case 'confusion_matrix':
        // Draw confusion matrix
        const matrix = [[425, 78], [56, 459]];
        const cellSize = Math.min(width, height) / 3;
        const startX = (width - cellSize * 2) / 2;
        const startY = (height - cellSize * 2) / 2;
        
        for (let i = 0; i < 2; i++) {
          for (let j = 0; j < 2; j++) {
            const x = startX + j * cellSize;
            const y = startY + i * cellSize;
            const value = matrix[i][j];
            const intensity = value / Math.max(...matrix.flat());
            
            // Draw cell
            ctx.fillStyle = `rgba(25, 118, 210, ${intensity})`;
            ctx.fillRect(x, y, cellSize, cellSize);
            
            // Draw border
            ctx.strokeStyle = '#333';
            ctx.lineWidth = 2;
            ctx.strokeRect(x, y, cellSize, cellSize);
            
            // Draw value
            ctx.fillStyle = intensity > 0.5 ? '#fff' : '#333';
            ctx.font = 'bold 24px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(value.toString(), x + cellSize / 2, y + cellSize / 2 + 8);
          }
        }
        
        // Labels
        ctx.fillStyle = '#333';
        ctx.font = '14px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Predicted', width / 2, startY - 20);
        ctx.fillText('Benign', startX + cellSize / 2, startY - 5);
        ctx.fillText('Malignant', startX + cellSize * 1.5, startY - 5);
        
        ctx.save();
        ctx.translate(startX - 20, height / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.fillText('Actual', -20, 0);
        ctx.restore();
        
        ctx.textAlign = 'right';
        ctx.fillText('Benign', startX - 5, startY + cellSize / 2 + 5);
        ctx.fillText('Malignant', startX - 5, startY + cellSize * 1.5 + 5);
        break;
    }
  }, []);

  // Export functions
  const exportResults = useCallback(() => {
    if (!project || !selectedAnalysis) return;
    
    const analysis = project.analyses.find(a => a.id === selectedAnalysis);
    if (!analysis) return;
    
    const data = {
      project: project.name,
      analysis: analysis.name,
      results: analysis.results,
      timestamp: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analysis_results_${analysis.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [project, selectedAnalysis]);

  const renderProjectOverview = () => (
    <div className="bg-white rounded-lg border shadow-sm">
      <div className="p-6">
        <h3 className="text-lg font-semibold mb-4">Project Overview</h3>
        
        {project && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="text-sm font-medium mb-3">Project Information</h4>
              <div className="space-y-2">
                <p className="text-sm"><strong>Name:</strong> {project.name}</p>
                <p className="text-sm"><strong>PI:</strong> {project.principal_investigator}</p>
                <p className="text-sm"><strong>Institution:</strong> {project.institution}</p>
                <p className="text-sm flex items-center gap-2">
                  <strong>Status:</strong> 
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    project.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {project.status}
                  </span>
                </p>
                <p className="text-sm mt-3">
                  <strong>Description:</strong> {project.description}
                </p>
              </div>
            </div>
            
            <div>
              <h4 className="text-sm font-medium mb-3">Statistics</h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-blue-600">{project.datasets.length}</div>
                  <div className="text-xs text-gray-600">Datasets</div>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-blue-600">{project.analyses.length}</div>
                  <div className="text-xs text-gray-600">Analyses</div>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-blue-600">{project.models.length}</div>
                  <div className="text-xs text-gray-600">Models</div>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-blue-600">{project.publications.length}</div>
                  <div className="text-xs text-gray-600">Publications</div>
                </div>
              </div>
            </div>
            
            <div className="col-span-full">
              <h4 className="text-sm font-medium mb-3">Funding Information</h4>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm">
                  <strong>{project.funding.agency}</strong> - Grant #{project.funding.grant_number}
                </p>
                <p className="text-sm">
                  Amount: ${project.funding.amount.toLocaleString()} {project.funding.currency}
                </p>
                <p className="text-sm">
                  Period: {project.funding.start_date} to {project.funding.end_date}
                </p>
              </div>
            </div>
            
            <div className="col-span-full">
              <h4 className="text-sm font-medium mb-3">Ethics Approval</h4>
              <div className={`border rounded-lg p-4 ${
                project.ethics_approval.status === 'approved' 
                  ? 'bg-green-50 border-green-200' 
                  : 'bg-yellow-50 border-yellow-200'
              }`}>
                <p className="text-sm">
                  <strong>IRB #{project.ethics_approval.irb_number}</strong> - {project.ethics_approval.institution}
                </p>
                <p className="text-sm">
                  Status: {project.ethics_approval.status} | 
                  Expires: {project.ethics_approval.expiration_date}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const renderDatasetManager = () => (
    <div className="bg-white rounded-lg border shadow-sm">
      <div className="p-6">
        <h3 className="text-lg font-semibold mb-4">Dataset Management</h3>
        
        {project && (
          <div>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Select Dataset</label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={selectedDataset || ''}
                onChange={(e) => setSelectedDataset(e.target.value)}
              >
                <option value="">Choose a dataset...</option>
                {project.datasets.map(dataset => (
                  <option key={dataset.id} value={dataset.id}>
                    {dataset.name} ({dataset.patient_count} patients)
                  </option>
                ))}
              </select>
            </div>
            
            {selectedDataset && (() => {
              const dataset = project.datasets.find(d => d.id === selectedDataset);
              if (!dataset) return null;
              
              return (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="text-sm font-medium mb-3">Dataset Information</h4>
                    <div className="space-y-2">
                      <p className="text-sm"><strong>Name:</strong> {dataset.name}</p>
                      <p className="text-sm"><strong>Modality:</strong> {dataset.modality.join(', ')}</p>
                      <p className="text-sm"><strong>Patients:</strong> {dataset.patient_count}</p>
                      <p className="text-sm"><strong>Images:</strong> {dataset.image_count.toLocaleString()}</p>
                      <p className="text-sm"><strong>Size:</strong> {dataset.size_gb} GB</p>
                      <p className="text-sm flex items-center gap-2">
                        <strong>Privacy:</strong> 
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          dataset.privacy_level === 'public' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {dataset.privacy_level}
                        </span>
                      </p>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium mb-3">Demographics</h4>
                    <div className="space-y-2">
                      <p className="text-sm">
                        <strong>Age:</strong> {dataset.demographics.age_mean.toFixed(1)} ± {dataset.demographics.age_std.toFixed(1)} years
                      </p>
                      <p className="text-sm">
                        <strong>Range:</strong> {dataset.demographics.age_range[0]}-{dataset.demographics.age_range[1]} years
                      </p>
                      <p className="text-sm">
                        <strong>Gender:</strong> {dataset.demographics.gender_distribution.male}M / {dataset.demographics.gender_distribution.female}F
                      </p>
                    </div>
                  </div>
                  
                  <div className="col-span-full">
                    <h4 className="text-sm font-medium mb-3">Quality Metrics</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div className="bg-gray-50 p-4 rounded-lg text-center">
                        <div className="text-lg font-bold text-blue-600">
                          {(dataset.quality_metrics.image_quality_score * 100).toFixed(0)}%
                        </div>
                        <div className="text-xs text-gray-600">Image Quality</div>
                      </div>
                      <div className="bg-gray-50 p-4 rounded-lg text-center">
                        <div className="text-lg font-bold text-blue-600">
                          {(dataset.quality_metrics.protocol_compliance * 100).toFixed(0)}%
                        </div>
                        <div className="text-xs text-gray-600">Protocol Compliance</div>
                      </div>
                      <div className="bg-gray-50 p-4 rounded-lg text-center">
                        <div className="text-lg font-bold text-blue-600">
                          {(dataset.quality_metrics.motion_artifacts * 100).toFixed(1)}%
                        </div>
                        <div className="text-xs text-gray-600">Motion Artifacts</div>
                        </div>
                      <div className="bg-gray-50 p-4 rounded-lg text-center">
                        <div className="text-lg font-bold text-blue-600">
                          {(dataset.quality_metrics.missing_data_percentage * 100).toFixed(1)}%
                        </div>
                        <div className="text-xs text-gray-600">Missing Data</div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="col-span-full">
                    <h4 className="text-sm font-medium mb-3">Annotations</h4>
                    <div className="bg-white rounded-lg border overflow-hidden">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Annotator</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Count</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quality</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {dataset.annotations.map((annotation) => (
                            <tr key={annotation.id}>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{annotation.name}</td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 border">
                                  {annotation.type}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{annotation.annotator}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{annotation.annotation_count.toLocaleString()}</td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center">
                                  <div className="flex-1 bg-gray-200 rounded-full h-2 mr-2">
                                    <div 
                                      className="bg-blue-600 h-2 rounded-full" 
                                      style={{ width: `${annotation.quality_score * 100}%` }}
                                    ></div>
                                  </div>
                                  <span className="text-xs text-gray-600">
                                    {(annotation.quality_score * 100).toFixed(0)}%
                                  </span>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                  annotation.validation_status === 'validated' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                                }`}>
                                  {annotation.validation_status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </div>
    </div>
  );

  const renderAnalysisWorkbench = () => (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Analysis Workbench</h3>
          <div className="flex gap-2">
            <button
              className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              onClick={() => setShowConfigDialog(true)}
            >
              <SettingsIcon className="w-4 h-4 mr-2" />
              Configure
            </button>
            <button
              className="inline-flex items-center px-3 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
              onClick={runAnalysis}
              disabled={isRunningAnalysis || !selectedDataset}
            >
              <PlayIcon className="w-4 h-4 mr-2" />
              {isRunningAnalysis ? 'Running...' : 'Run Analysis'}
            </button>
          </div>
        </div>
        
        {isRunningAnalysis && (
          <div className="mb-6">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                style={{ width: `${analysisProgress}%` }}
              ></div>
            </div>
            <p className="text-sm text-gray-600 mt-2">
              Progress: {Math.round(analysisProgress)}%
            </p>
          </div>
        )}
        
        {project && (
          <div className="bg-white rounded-lg border overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dataset</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Performance</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {project.analyses.map((analysis) => {
                  const dataset = project.datasets.find(d => d.id === analysis.dataset_ids[0]);
                  
                  return (
                    <tr 
                      key={analysis.id}
                      className={`cursor-pointer hover:bg-gray-50 ${
                        selectedAnalysis === analysis.id ? 'bg-blue-50' : ''
                      }`}
                      onClick={() => setSelectedAnalysis(analysis.id)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{analysis.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 border">
                          {analysis.type}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{dataset?.name || 'Unknown'}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          analysis.status === 'completed' ? 'bg-green-100 text-green-800' :
                          analysis.status === 'running' ? 'bg-yellow-100 text-yellow-800' :
                          analysis.status === 'failed' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {analysis.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {analysis.results.metrics.accuracy && (
                          <div>
                            Acc: {(analysis.results.metrics.accuracy * 100).toFixed(1)}%
                          </div>
                        )}
                        {analysis.results.metrics.auc_roc && (
                          <div className="text-xs text-gray-500">
                            AUC: {analysis.results.metrics.auc_roc.toFixed(3)}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(analysis.created_date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex space-x-2">
                          <button
                            className="text-blue-600 hover:text-blue-900 disabled:text-gray-400"
                            onClick={(e: React.MouseEvent) => {
                              e.stopPropagation();
                              // View results functionality can be implemented here
                            }}
                            disabled={analysis.status !== 'completed'}
                          >
                            <VisibilityIcon className="w-4 h-4" />
                          </button>
                          <button
                            className="text-blue-600 hover:text-blue-900 disabled:text-gray-400"
                            onClick={(e: React.MouseEvent) => {
                              e.stopPropagation();
                              exportResults();
                            }}
                            disabled={analysis.status !== 'completed'}
                          >
                            <DownloadIcon className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );

  const renderModelManager = () => (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6">
        <h3 className="text-lg font-semibold mb-4">Model Management</h3>
        
        {project && (
          <div className="bg-white rounded-lg border overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Framework</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Performance</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Size</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {project.models.map((model) => (
                  <tr 
                    key={model.id}
                    className={`cursor-pointer hover:bg-gray-50 ${
                      selectedModel === model.id ? 'bg-blue-50' : ''
                    }`}
                    onClick={() => setSelectedModel(model.id)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{model.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 border">
                        {model.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {model.framework}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div>
                        Acc: {(model.performance_metrics.accuracy! * 100).toFixed(1)}%
                      </div>
                      <div className="text-xs text-gray-500">
                        AUC: {model.performance_metrics.auc_roc!.toFixed(3)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span 
                        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          model.deployment_status === 'production' ? 'bg-green-100 text-green-800' :
                          model.deployment_status === 'testing' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {model.deployment_status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div>{model.model_size_mb} MB</div>
                      <div className="text-xs text-gray-500">
                        {model.inference_time_ms}ms inference
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex space-x-1">
                        <button className="p-1 text-gray-400 hover:text-gray-600">
                          <VisibilityIcon className="w-4 h-4" />
                        </button>
                        <button className="p-1 text-gray-400 hover:text-gray-600">
                          <DownloadIcon className="w-4 h-4" />
                        </button>
                        <button className="p-1 text-gray-400 hover:text-gray-600">
                          <SettingsIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );

  const renderVisualizationPanel = () => (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6">
        <h3 className="text-lg font-semibold mb-4">Analysis Visualizations</h3>
        
        <div className="mb-4">
          <div className="flex space-x-2">
            <button
              className={`px-4 py-2 rounded-md text-sm font-medium ${
                selectedVisualization === 'roc_curve' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
              onClick={() => {
                setSelectedVisualization('roc_curve');
                drawVisualization('roc_curve');
              }}
            >
              ROC Curve
            </button>
            <button
              className={`px-4 py-2 rounded-md text-sm font-medium ${
                selectedVisualization === 'feature_importance' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
              onClick={() => {
                setSelectedVisualization('feature_importance');
                drawVisualization('feature_importance');
              }}
            >
              Feature Importance
            </button>
            <button
              className={`px-4 py-2 rounded-md text-sm font-medium ${
                selectedVisualization === 'confusion_matrix' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
              onClick={() => {
                setSelectedVisualization('confusion_matrix');
                drawVisualization('confusion_matrix');
              }}
            >
              Confusion Matrix
            </button>
          </div>
        </div>
        
        <div className="bg-white rounded-lg border p-4 text-center">
          <canvas
            ref={canvasRef}
            width={600}
            height={400}
            style={{ maxWidth: '100%', height: 'auto', border: '1px solid #ddd' }}
          />
        </div>
      </div>
    </div>
  );

  // Configuration Dialog
  const ConfigurationDialog = () => (
    <Dialog.Root open={showConfigDialog} onOpenChange={setShowConfigDialog}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50" />
        <Dialog.Content className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
          <Dialog.Title className="text-xl font-semibold mb-4">Analysis Configuration</Dialog.Title>
          <div className="space-y-4">
        <div className="border border-gray-200 rounded-lg">
          <div className="p-4 border-b border-gray-200">
            <h4 className="text-lg font-medium flex items-center">
              Preprocessing
              <ExpandMoreIcon className="ml-2 w-5 h-5" />
            </h4>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Normalization Method
                </label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={analysisConfig.preprocessing.normalization.method}
                  onChange={(e) => setAnalysisConfig(prev => ({
                    ...prev,
                    preprocessing: {
                      ...prev.preprocessing,
                      normalization: {
                        ...prev.preprocessing.normalization,
                        method: e.target.value as any
                      }
                    }
                  }))}
                >
                  <option value="z_score">Z-Score</option>
                  <option value="min_max">Min-Max</option>
                  <option value="robust">Robust</option>
                  <option value="quantile">Quantile</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Interpolation
                </label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={analysisConfig.preprocessing.resampling.interpolation}
                  onChange={(e) => setAnalysisConfig(prev => ({
                    ...prev,
                    preprocessing: {
                      ...prev.preprocessing,
                      resampling: {
                        ...prev.preprocessing.resampling,
                        interpolation: e.target.value as any
                      }
                    }
                  }))}
                >
                  <option value="linear">Linear</option>
                  <option value="nearest">Nearest</option>
                  <option value="cubic">Cubic</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                    checked={analysisConfig.preprocessing.augmentation.enabled}
                    onChange={(e) => setAnalysisConfig(prev => ({
                      ...prev,
                      preprocessing: {
                        ...prev.preprocessing,
                        augmentation: {
                          ...prev.preprocessing.augmentation,
                          enabled: e.target.checked
                        }
                      }
                    }))}
                  />
                  <span className="text-sm font-medium text-gray-700">Enable Data Augmentation</span>
                </label>
              </div>
            </div>
          </div>
        </div>
        
        <div className="border border-gray-200 rounded-lg">
          <div className="p-4 border-b border-gray-200">
            <h4 className="text-lg font-medium flex items-center">
              Feature Extraction
              <ExpandMoreIcon className="ml-2 w-5 h-5" />
            </h4>
          </div>
          <div className="p-4">
            <div className="space-y-3">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                  checked={analysisConfig.feature_extraction.radiomics.enabled}
                  onChange={(e) => setAnalysisConfig(prev => ({
                    ...prev,
                    feature_extraction: {
                      ...prev.feature_extraction,
                      radiomics: {
                        ...prev.feature_extraction.radiomics,
                        enabled: e.target.checked
                      }
                    }
                  }))}
                />
                <span className="text-sm font-medium text-gray-700">Radiomics Features</span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                  checked={analysisConfig.feature_extraction.deep_features.enabled}
                  onChange={(e) => setAnalysisConfig(prev => ({
                    ...prev,
                    feature_extraction: {
                        ...prev.feature_extraction,
                        deep_features: {
                          ...prev.feature_extraction.deep_features,
                          enabled: e.target.checked
                        }
                      }
                    }))}
                  />
                  <span className="text-sm font-medium text-gray-700">Deep Learning Features</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                    checked={analysisConfig.feature_extraction.texture.enabled}
                    onChange={(e) => setAnalysisConfig(prev => ({
                      ...prev,
                      feature_extraction: {
                        ...prev.feature_extraction,
                        texture: {
                          ...prev.feature_extraction.texture,
                          enabled: e.target.checked
                        }
                      }
                    }))}
                  />
                  <span className="text-sm font-medium text-gray-700">Texture Analysis</span>
                </label>
              </div>
            </div>
          </div>
        
        <div className="border border-gray-200 rounded-lg">
          <div className="p-4 border-b border-gray-200">
            <h4 className="text-lg font-medium flex items-center">
              Model Configuration
              <ExpandMoreIcon className="ml-2 w-5 h-5" />
            </h4>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Algorithm
                </label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={analysisConfig.model_config.algorithm}
                  onChange={(e) => setAnalysisConfig(prev => ({
                    ...prev,
                    model_config: {
                      ...prev.model_config,
                      algorithm: e.target.value
                    }
                  }))}
                >
                  <option value="random_forest">Random Forest</option>
                  <option value="svm">Support Vector Machine</option>
                  <option value="xgboost">XGBoost</option>
                  <option value="neural_network">Neural Network</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Learning Rate
                </label>
                <input
                  type="number"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={analysisConfig.model_config.learning_rate}
                  onChange={(e) => setAnalysisConfig(prev => ({
                    ...prev,
                    model_config: {
                      ...prev.model_config,
                      learning_rate: parseFloat(e.target.value)
                    }
                  }))}
                  step={0.001}
                  min={0.0001}
                  max={1}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Batch Size
                </label>
                <input
                  type="number"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={analysisConfig.model_config.batch_size}
                  onChange={(e) => setAnalysisConfig(prev => ({
                    ...prev,
                    model_config: {
                      ...prev.model_config,
                      batch_size: parseInt(e.target.value)
                    }
                  }))}
                  min={1}
                  max={512}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Epochs
                </label>
                <input
                  type="number"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={analysisConfig.model_config.epochs}
                  onChange={(e) => setAnalysisConfig(prev => ({
                    ...prev,
                    model_config: {
                      ...prev.model_config,
                      epochs: parseInt(e.target.value)
                    }
                  }))}
                  min={1}
                  max={1000}
                />
              </div>
            </div>
          </div>
        </div>
          </div>
          <div className="flex justify-end gap-2 mt-6">
            <button 
              onClick={() => setShowConfigDialog(false)}
              className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
            >
              Cancel
            </button>
            <button 
              onClick={() => setShowConfigDialog(false)}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Save Configuration
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">
        Research Analytics Platform
      </h1>
      
      <Tabs.Root value={activeTab.toString()} onValueChange={(value) => setActiveTab(parseInt(value))} className="mb-6">
        <Tabs.List className="flex border-b">
          <Tabs.Trigger value="0" className="px-4 py-2 border-b-2 border-transparent data-[state=active]:border-blue-500">Project Overview</Tabs.Trigger>
          <Tabs.Trigger value="1" className="px-4 py-2 border-b-2 border-transparent data-[state=active]:border-blue-500">Dataset Manager</Tabs.Trigger>
          <Tabs.Trigger value="2" className="px-4 py-2 border-b-2 border-transparent data-[state=active]:border-blue-500">Analysis Workbench</Tabs.Trigger>
          <Tabs.Trigger value="3" className="px-4 py-2 border-b-2 border-transparent data-[state=active]:border-blue-500">Model Manager</Tabs.Trigger>
          <Tabs.Trigger value="4" className="px-4 py-2 border-b-2 border-transparent data-[state=active]:border-blue-500">Visualizations</Tabs.Trigger>
        </Tabs.List>
        
        <Tabs.Content value="0">{renderProjectOverview()}</Tabs.Content>
        <Tabs.Content value="1">{renderDatasetManager()}</Tabs.Content>
        <Tabs.Content value="2">{renderAnalysisWorkbench()}</Tabs.Content>
        <Tabs.Content value="3">{renderModelManager()}</Tabs.Content>
        <Tabs.Content value="4">{renderVisualizationPanel()}</Tabs.Content>
      </Tabs.Root>
      
      <ConfigurationDialog />
    </div>
  );
};

export default ResearchAnalytics;