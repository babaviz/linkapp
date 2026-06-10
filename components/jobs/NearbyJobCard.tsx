import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { JobPosting } from '../../types/job';

interface NearbyJobCardProps {
  job: JobPosting;
  distance?: number;
  distanceFormatted?: string;
}

export function NearbyJobCard({
  job,
  distance,
  distanceFormatted
}: NearbyJobCardProps) {
  return (
    <View style={styles.card}>
      {distanceFormatted && (
        <View style={styles.distanceBadge}>
          <Ionicons name="location" size={12} color="#fff" />
          <Text style={styles.distanceText}>{distanceFormatted}</Text>
        </View>
      )}

      <View style={styles.header}>
        <View style={styles.companyBadge}>
          <Text style={styles.companyInitial}>
            {job.employer.company.charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={styles.headerInfo}>
          <Text style={styles.title} numberOfLines={1}>
            {job.title}
          </Text>
          <Text style={styles.company} numberOfLines={1}>
            {job.employer.company}
          </Text>
        </View>
        {job.employer.verified && (
          <Ionicons name="checkmark-circle" size={18} color="#10b981" />
        )}
      </View>

      <View style={styles.locationRow}>
        <Ionicons name="location-outline" size={14} color="#666" />
        <Text style={styles.location} numberOfLines={1}>
          {job.location.town}, {job.location.county}
        </Text>
      </View>

      <View style={styles.tagsRow}>
        <View style={styles.tag}>
          <Text style={styles.tagText}>{job.job_type.replace('_', ' ')}</Text>
        </View>
        <View style={styles.tag}>
          <Text style={styles.tagText}>{job.experience_level}</Text>
        </View>
      </View>

      {job.salary && (
        <Text style={styles.salary}>
          KSH {job.salary.min.toLocaleString()} - {job.salary.max.toLocaleString()}
          <Text style={styles.salaryPeriod}>/{job.salary.period}</Text>
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 260,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  distanceBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0, 122, 255, 0.9)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    zIndex: 1,
  },
  distanceText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  companyBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  companyInitial: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  headerInfo: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 2,
  },
  company: {
    fontSize: 13,
    color: '#666',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 12,
  },
  location: {
    flex: 1,
    fontSize: 13,
    color: '#666',
  },
  tagsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  tag: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tagText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#666',
    textTransform: 'capitalize',
  },
  salary: {
    fontSize: 15,
    fontWeight: '700',
    color: '#10b981',
  },
  salaryPeriod: {
    fontSize: 12,
    fontWeight: '400',
    color: '#999',
  },
});
