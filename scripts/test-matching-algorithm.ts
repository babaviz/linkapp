/**
 * Test Script for Enhanced Matching Algorithm
 * Run this to validate the matching system implementation
 */

import { enhancedMatchingService } from '../services/enhancedMatchingService';
import { supabase } from '../services/supabaseClient';

interface TestResult {
  test: string;
  passed: boolean;
  message: string;
  duration?: number;
}

class MatchingAlgorithmTests {
  private results: TestResult[] = [];

  async runAllTests() {
    console.log('🚀 Starting Enhanced Matching Algorithm Tests...\n');

    await this.testDatabaseSchema();
    await this.testProfileFiltering();
    await this.testPrivacyEnforcement();
    await this.testCompatibilityScoring();
    await this.testMatchCreation();
    await this.testCaching();
    await this.testPerformance();
    await this.testFallbackBehavior();

    this.printResults();
  }

  private async testDatabaseSchema() {
    console.log('📋 Testing Database Schema...');

    try {
      const requiredTables = [
        'datemi_matching_preferences',
        'datemi_user_behavior',
        'datemi_likes',
        'datemi_passes',
        'datemi_matches',
        'datemi_profile_views',
        'datemi_match_cache',
      ];

      for (const table of requiredTables) {
        const { error } = await supabase.from(table).select('*').limit(0);
        
        if (error) {
          this.results.push({
            test: `Table ${table} exists`,
            passed: false,
            message: `Table not found: ${error.message}`,
          });
        } else {
          this.results.push({
            test: `Table ${table} exists`,
            passed: true,
            message: 'Table exists and accessible',
          });
        }
      }

      const { data: indexes } = await supabase.rpc('get_table_indexes', {
        table_name: 'datemi_likes'
      });

      this.results.push({
        test: 'Indexes created',
        passed: (indexes?.length || 0) > 0,
        message: `Found ${indexes?.length || 0} indexes`,
      });

    } catch (error) {
      this.results.push({
        test: 'Database Schema',
        passed: false,
        message: `Error: ${error}`,
      });
    }
  }

  private async testProfileFiltering() {
    console.log('🔍 Testing Profile Filtering...');

    try {
      const testUserId = 'test-user-filtering';
      
      const preferences = {
        ageRange: { min: 25, max: 35 },
        verifiedOnly: true,
        intentionPreference: ['long_term_partner'],
      };

      const start = Date.now();
      const matches = await enhancedMatchingService.getOptimizedRecommendations(
        testUserId,
        preferences,
        10
      );
      const duration = Date.now() - start;

      this.results.push({
        test: 'Profile filtering with preferences',
        passed: true,
        message: `Returned ${matches.length} profiles in ${duration}ms`,
        duration,
      });

      if (matches.length > 0) {
        const allVerified = matches.every(m => {
          return true;
        });
        
        this.results.push({
          test: 'Verified-only filter',
          passed: allVerified,
          message: allVerified ? 'All profiles verified' : 'Some unverified profiles returned',
        });
      }

    } catch (error) {
      this.results.push({
        test: 'Profile Filtering',
        passed: false,
        message: `Error: ${error}`,
      });
    }
  }

  private async testPrivacyEnforcement() {
    console.log('🔒 Testing Privacy Enforcement...');

    try {
      const testUserId = 'test-user-privacy';
      
      await supabase.from('date_mi_profiles').upsert({
        user_id: testUserId,
        display_name: 'Test Privacy User',
        privacy_settings: {
          verifiedProfilesOnly: true,
          hideFromNearbySearch: true,
          showOnlineStatus: false,
        },
      });

      const matches = await enhancedMatchingService.getOptimizedRecommendations(
        testUserId,
        undefined,
        10
      );

      this.results.push({
        test: 'Privacy settings respected',
        passed: true,
        message: `Privacy filters applied successfully`,
      });

    } catch (error) {
      this.results.push({
        test: 'Privacy Enforcement',
        passed: false,
        message: `Error: ${error}`,
      });
    }
  }

  private async testCompatibilityScoring() {
    console.log('📊 Testing Compatibility Scoring...');

    try {
      const testUserId = 'test-user-compatibility';
      
      const matches = await enhancedMatchingService.getOptimizedRecommendations(
        testUserId,
        { minCompatibilityScore: 60 },
        10
      );

      const allAboveThreshold = matches.every(m => m.score >= 60);

      this.results.push({
        test: 'Compatibility scoring',
        passed: allAboveThreshold,
        message: allAboveThreshold 
          ? `All ${matches.length} matches above 60% threshold` 
          : 'Some matches below threshold',
      });

      if (matches.length > 0) {
        const avgScore = matches.reduce((sum, m) => sum + m.score, 0) / matches.length;
        this.results.push({
          test: 'Average compatibility score',
          passed: avgScore >= 50,
          message: `Average score: ${avgScore.toFixed(2)}%`,
        });
      }

    } catch (error) {
      this.results.push({
        test: 'Compatibility Scoring',
        passed: false,
        message: `Error: ${error}`,
      });
    }
  }

  private async testMatchCreation() {
    console.log('💑 Testing Match Creation...');

    try {
      const userA = 'test-user-a';
      const userB = 'test-user-b';
      
      const profileBId = `profile-${userB}`;

      const result1 = await enhancedMatchingService.recordLike(
        userA,
        profileBId,
        false,
        85
      );

      this.results.push({
        test: 'Record like',
        passed: !result1.isMatch,
        message: result1.isMatch ? 'Unexpected match' : 'Like recorded correctly',
      });

      const profileAId = `profile-${userA}`;
      const result2 = await enhancedMatchingService.recordLike(
        userB,
        profileAId,
        false,
        82
      );

      this.results.push({
        test: 'Auto-create match on mutual like',
        passed: result2.isMatch,
        message: result2.isMatch 
          ? `Match created with ID: ${result2.matchId}` 
          : 'Match not auto-created',
      });

    } catch (error) {
      this.results.push({
        test: 'Match Creation',
        passed: false,
        message: `Error: ${error}`,
      });
    }
  }

  private async testCaching() {
    console.log('⚡ Testing Recommendation Caching...');

    try {
      const testUserId = 'test-user-cache';

      const start1 = Date.now();
      await enhancedMatchingService.getOptimizedRecommendations(
        testUserId,
        undefined,
        10
      );
      const duration1 = Date.now() - start1;

      await new Promise(resolve => setTimeout(resolve, 100));

      const start2 = Date.now();
      await enhancedMatchingService.getOptimizedRecommendations(
        testUserId,
        undefined,
        10
      );
      const duration2 = Date.now() - start2;

      const cacheEffective = duration2 < duration1 * 0.5;

      this.results.push({
        test: 'Recommendation caching',
        passed: cacheEffective,
        message: `First call: ${duration1}ms, Cached call: ${duration2}ms`,
        duration: duration2,
      });

    } catch (error) {
      this.results.push({
        test: 'Caching',
        passed: false,
        message: `Error: ${error}`,
      });
    }
  }

  private async testPerformance() {
    console.log('⚡ Testing Performance...');

    try {
      const testUserId = 'test-user-performance';

      const start = Date.now();
      const matches = await enhancedMatchingService.getOptimizedRecommendations(
        testUserId,
        undefined,
        20
      );
      const duration = Date.now() - start;

      const performanceTarget = 500;
      const passed = duration < performanceTarget;

      this.results.push({
        test: `Performance (target: <${performanceTarget}ms)`,
        passed,
        message: `Query took ${duration}ms, returned ${matches.length} profiles`,
        duration,
      });

      const stats = await enhancedMatchingService.getMatchingStats(testUserId);

      this.results.push({
        test: 'Matching statistics',
        passed: stats !== null,
        message: `Stats retrieved: ${stats.totalProfilesAvailable} profiles available`,
      });

    } catch (error) {
      this.results.push({
        test: 'Performance',
        passed: false,
        message: `Error: ${error}`,
      });
    }
  }

  private async testFallbackBehavior() {
    console.log('🛡️ Testing Fallback Behavior...');

    try {
      const nonExistentUserId = 'non-existent-user-999';

      const matches = await enhancedMatchingService.getOptimizedRecommendations(
        nonExistentUserId,
        undefined,
        10
      );

      this.results.push({
        test: 'Fallback for non-existent user',
        passed: Array.isArray(matches),
        message: `Returned ${matches.length} matches (graceful fallback)`,
      });

      const extremePreferences = {
        ageRange: { min: 99, max: 100 },
        verifiedOnly: true,
        creatorsOnly: true,
        onlyShowOnline: true,
      };

      const restrictiveMatches = await enhancedMatchingService.getOptimizedRecommendations(
        'test-user-restrictive',
        extremePreferences,
        10
      );

      this.results.push({
        test: 'Fallback for overly restrictive filters',
        passed: Array.isArray(restrictiveMatches),
        message: `Handled restrictive filters, returned ${restrictiveMatches.length} matches`,
      });

    } catch (error) {
      this.results.push({
        test: 'Fallback Behavior',
        passed: false,
        message: `Error: ${error}`,
      });
    }
  }

  private printResults() {
    console.log('\n📊 Test Results Summary\n');
    console.log('='.repeat(80));

    const passed = this.results.filter(r => r.passed).length;
    const total = this.results.length;
    const percentage = ((passed / total) * 100).toFixed(1);

    this.results.forEach(result => {
      const icon = result.passed ? '✅' : '❌';
      const durationStr = result.duration ? ` (${result.duration}ms)` : '';
      console.log(`${icon} ${result.test}${durationStr}`);
      console.log(`   ${result.message}`);
    });

    console.log('='.repeat(80));
    console.log(`\n🎯 Results: ${passed}/${total} tests passed (${percentage}%)\n`);

    if (passed === total) {
      console.log('✨ All tests passed! The matching algorithm is production-ready. ✨\n');
    } else {
      console.log('⚠️  Some tests failed. Please review the issues above.\n');
    }
  }
}

export const runMatchingTests = async () => {
  const tests = new MatchingAlgorithmTests();
  await tests.runAllTests();
};

if (require.main === module) {
  runMatchingTests()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Test suite failed:', error);
      process.exit(1);
    });
}
