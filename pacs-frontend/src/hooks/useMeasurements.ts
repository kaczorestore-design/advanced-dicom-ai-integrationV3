import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';

interface Measurement {
  id: string;
  studyId: number;
  imageIndex: number;
  type: 'length' | 'angle' | 'rectangle' | 'ellipse' | 'freehand' | 'cobb';
  value: number;
  unit: string;
  coordinates: number[][];
  annotation?: string;
  createdBy: string;
  createdAt: string;
  modifiedAt?: string;
}

export const useMeasurements = (studyId: number) => {
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [loading, setLoading] = useState(false);
  const { token, user } = useAuth();
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

  const saveMeasurement = async (measurement: Omit<Measurement, 'id' | 'createdBy' | 'createdAt'>) => {
    try {
      const response = await fetch(`${API_URL}/studies/${studyId}/measurements`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...measurement,
          createdBy: user?.username || 'unknown'
        })
      });

      if (response.ok) {
        const savedMeasurement = await response.json();
        setMeasurements(prev => [...prev, savedMeasurement]);
        return savedMeasurement;
      }
    } catch (error) {
      console.error('Error saving measurement:', error);
    }
  };

  const loadMeasurements = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/studies/${studyId}/measurements`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setMeasurements(data);
      }
    } catch (error) {
      console.error('Error loading measurements:', error);
    } finally {
      setLoading(false);
    }
  }, [API_URL, studyId, token]);

  const deleteMeasurement = async (measurementId: string) => {
    try {
      const response = await fetch(`${API_URL}/studies/${studyId}/measurements/${measurementId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        setMeasurements(prev => prev.filter(m => m.id !== measurementId));
      }
    } catch (error) {
      console.error('Error deleting measurement:', error);
    }
  };

  useEffect(() => {
    if (studyId && token) {
      loadMeasurements();
    }
  }, [studyId, token, loadMeasurements]);

  return {
    measurements,
    loading,
    saveMeasurement,
    deleteMeasurement,
    refreshMeasurements: loadMeasurements
  };
};
