import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { Network, Wifi, WifiOff, Search, Download } from 'lucide-react';
import { DICOMNetworkService, DIMSEConfig } from '../services/dicomTraditional';
import { DICOMwebConfig } from '../services/dicomweb';

interface DICOMStudy {
  '0020,000D'?: string; // Study Instance UID (DIMSE format)
  '0020000D'?: { Value: string[] }; // Study Instance UID (DICOMweb format)
  '0010,0020'?: string; // Patient ID (DIMSE format)
  '00100020'?: { Value: string[] }; // Patient ID (DICOMweb format)
  '0010,0010'?: string; // Patient Name (DIMSE format)
  '00100010'?: { Value: string[] }; // Patient Name (DICOMweb format)
  '0008,0020'?: string; // Study Date (DIMSE format)
  '00080020'?: { Value: string[] }; // Study Date (DICOMweb format)
  '0008,0060'?: string; // Modality (DIMSE format)
  '00080060'?: { Value: string[] }; // Modality (DICOMweb format)
  [key: string]: unknown; // Allow for additional DICOM tags
}

interface DICOMNetworkPanelProps {
  onStudySelected?: (study: DICOMStudy) => void;
}

export const DICOMNetworkPanel: React.FC<DICOMNetworkPanelProps> = ({ onStudySelected }) => {
  const [networkService, setNetworkService] = useState<DICOMNetworkService | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  const [searchResults, setSearchResults] = useState<DICOMStudy[]>([]);
  const [searchCriteria, setSearchCriteria] = useState({
    PatientID: '',
    PatientName: '',
    StudyDate: '',
    Modality: ''
  });
  const [useDIMSE, setUseDIMSE] = useState(false);
  const [config, setConfig] = useState({
    dicomweb: {
      wadoRsUrl: 'http://localhost:8000/dicomweb',
      qidoRsUrl: 'http://localhost:8000/dicomweb',
      stowRsUrl: 'http://localhost:8000/dicomweb',
      authToken: ''
    },
    dimse: {
      websocketUrl: 'ws://localhost:8000/dimse',
      host: 'localhost',
      port: 11112,
      callingAET: 'PACS_CLIENT',
      calledAET: 'PACS_SERVER',
      timeout: 30000
    }
  });

  useEffect(() => {
    initializeNetworkService();
  }, [useDIMSE]);

  const initializeNetworkService = () => {
    const dicomwebConfig: DICOMwebConfig = {
      ...config.dicomweb,
      authToken: localStorage.getItem('token') || ''
    };

    const dimseConfig: DIMSEConfig = config.dimse;

    const service = new DICOMNetworkService(
      dicomwebConfig,
      dimseConfig
    );

    setNetworkService(service);
  };

  const testConnection = async () => {
    if (!networkService) return;

    setConnectionStatus('connecting');
    try {
      const isConnected = await networkService.testConnection(useDIMSE);
      setConnectionStatus(isConnected ? 'connected' : 'disconnected');
    } catch (error) {
      console.error('Connection test failed:', error);
      setConnectionStatus('disconnected');
    }
  };

  const searchStudies = async () => {
    if (!networkService) return;

    try {
      const results = await networkService.searchStudies(searchCriteria, useDIMSE);
      setSearchResults(results);
    } catch (error) {
      console.error('Search failed:', error);
      setSearchResults([]);
    }
  };

  const retrieveStudy = async (study: DICOMStudy) => {
    if (!networkService) return;

    try {
      const studyUID = useDIMSE ? study['0020,000D'] : study['0020000D'].Value[0];
      await networkService.retrieveStudy(studyUID, useDIMSE);
      
      if (onStudySelected) {
        onStudySelected(study);
      }
    } catch (error) {
      console.error('Retrieve failed:', error);
    }
  };

  const getConnectionIcon = () => {
    switch (connectionStatus) {
      case 'connected':
        return <Wifi className="w-4 h-4 text-green-500" />;
      case 'connecting':
        return <Network className="w-4 h-4 text-yellow-500 animate-pulse" />;
      default:
        return <WifiOff className="w-4 h-4 text-red-500" />;
    }
  };

  const getConnectionBadge = () => {
    const variant = connectionStatus === 'connected' ? 'default' : 'destructive';
    return (
      <Badge variant={variant} className="ml-2">
        {connectionStatus.toUpperCase()}
      </Badge>
    );
  };

  return (
    <Card className="bg-gray-700 border-gray-600">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm text-white flex items-center">
          <Network className="w-4 h-4 mr-2" />
          DICOM Network
          {getConnectionBadge()}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Protocol Selection */}
        <div className="flex space-x-2">
          <Button
            variant={!useDIMSE ? 'default' : 'outline'}
            size="sm"
            onClick={() => setUseDIMSE(false)}
            className="text-xs"
          >
            DICOMweb
          </Button>
          <Button
            variant={useDIMSE ? 'default' : 'outline'}
            size="sm"
            onClick={() => setUseDIMSE(true)}
            className="text-xs"
          >
            DIMSE
          </Button>
        </div>

        {/* Connection Status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {getConnectionIcon()}
            <span className="text-xs text-gray-300">
              {useDIMSE ? 'DIMSE' : 'DICOMweb'} Connection
            </span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={testConnection}
            disabled={connectionStatus === 'connecting'}
            className="text-xs"
          >
            Test
          </Button>
        </div>

        <Separator className="bg-gray-600" />

        {/* Search Criteria */}
        <div className="space-y-2">
          <div className="text-xs text-gray-300 font-medium">Search Studies</div>
          <Input
            placeholder="Patient ID"
            value={searchCriteria.PatientID}
            onChange={(e) => setSearchCriteria(prev => ({ ...prev, PatientID: e.target.value }))}
            className="bg-gray-600 border-gray-500 text-white text-xs"
          />
          <Input
            placeholder="Patient Name"
            value={searchCriteria.PatientName}
            onChange={(e) => setSearchCriteria(prev => ({ ...prev, PatientName: e.target.value }))}
            className="bg-gray-600 border-gray-500 text-white text-xs"
          />
          <Input
            placeholder="Study Date (YYYYMMDD)"
            value={searchCriteria.StudyDate}
            onChange={(e) => setSearchCriteria(prev => ({ ...prev, StudyDate: e.target.value }))}
            className="bg-gray-600 border-gray-500 text-white text-xs"
          />
          <Input
            placeholder="Modality"
            value={searchCriteria.Modality}
            onChange={(e) => setSearchCriteria(prev => ({ ...prev, Modality: e.target.value }))}
            className="bg-gray-600 border-gray-500 text-white text-xs"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={searchStudies}
            disabled={connectionStatus !== 'connected'}
            className="w-full text-xs"
          >
            <Search className="w-3 h-3 mr-2" />
            Search
          </Button>
        </div>

        {/* Search Results */}
        {searchResults.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs text-gray-300 font-medium">
              Results ({searchResults.length})
            </div>
            <div className="max-h-40 overflow-y-auto space-y-1">
              {searchResults.map((study, index) => {
                const patientID = useDIMSE ? study['0010,0020'] : study['00100020']?.Value?.[0];
                const patientName = useDIMSE ? study['0010,0010'] : study['00100010']?.Value?.[0]?.Alphabetic;
                const studyDate = useDIMSE ? study['0008,0020'] : study['00080020']?.Value?.[0];
                const modality = useDIMSE ? study['0008,0060'] : study['00080060']?.Value?.[0];

                return (
                  <div
                    key={index}
                    className="bg-gray-600 p-2 rounded text-xs cursor-pointer hover:bg-gray-500"
                    onClick={() => retrieveStudy(study)}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="text-white font-medium">{patientName || 'Unknown'}</div>
                        <div className="text-gray-300">ID: {patientID}</div>
                        <div className="text-gray-400">{studyDate} • {modality}</div>
                      </div>
                      <Download className="w-3 h-3 text-gray-400" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Configuration */}
        <div className="space-y-2">
          <div className="text-xs text-gray-300 font-medium">Configuration</div>
          {useDIMSE ? (
            <div className="space-y-1">
              <Input
                placeholder="Host"
                value={config.dimse.host}
                onChange={(e) => setConfig(prev => ({
                  ...prev,
                  dimse: { ...prev.dimse, host: e.target.value }
                }))}
                className="bg-gray-600 border-gray-500 text-white text-xs"
              />
              <Input
                placeholder="Port"
                type="number"
                value={config.dimse.port}
                onChange={(e) => setConfig(prev => ({
                  ...prev,
                  dimse: { ...prev.dimse, port: parseInt(e.target.value) || 11112 }
                }))}
                className="bg-gray-600 border-gray-500 text-white text-xs"
              />
              <Input
                placeholder="Calling AET"
                value={config.dimse.callingAET}
                onChange={(e) => setConfig(prev => ({
                  ...prev,
                  dimse: { ...prev.dimse, callingAET: e.target.value }
                }))}
                className="bg-gray-600 border-gray-500 text-white text-xs"
              />
              <Input
                placeholder="Called AET"
                value={config.dimse.calledAET}
                onChange={(e) => setConfig(prev => ({
                  ...prev,
                  dimse: { ...prev.dimse, calledAET: e.target.value }
                }))}
                className="bg-gray-600 border-gray-500 text-white text-xs"
              />
            </div>
          ) : (
            <div className="space-y-1">
              <Input
                placeholder="WADO-RS Root URL"
                value={config.dicomweb.wadoRsUrl}
                onChange={(e) => setConfig(prev => ({
                  ...prev,
                  dicomweb: { ...prev.dicomweb, wadoRsUrl: e.target.value }
                }))}
                className="bg-gray-600 border-gray-500 text-white text-xs"
              />
              <Input
                placeholder="QIDO-RS Root URL"
                value={config.dicomweb.qidoRsUrl}
                onChange={(e) => setConfig(prev => ({
                  ...prev,
                  dicomweb: { ...prev.dicomweb, qidoRsUrl: e.target.value }
                }))}
                className="bg-gray-600 border-gray-500 text-white text-xs"
              />
              <Input
                placeholder="STOW-RS Root URL"
                value={config.dicomweb.stowRsUrl}
                onChange={(e) => setConfig(prev => ({
                  ...prev,
                  dicomweb: { ...prev.dicomweb, stowRsUrl: e.target.value }
                }))}
                className="bg-gray-600 border-gray-500 text-white text-xs"
              />
            </div>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={initializeNetworkService}
            className="w-full text-xs"
          >
            Update Configuration
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
