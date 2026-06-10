# Post Property Data Flow Test

## Overview
This document outlines how to test the complete Post Property functionality to ensure all components work together properly.

## Prerequisites
1. ✅ Redux store is configured with property slice
2. ✅ Supabase is configured with proper credentials
3. ✅ Database schema is up to date (run `database/schema.sql`)
4. ✅ Storage buckets are configured (run `database/storage.sql`)
5. ✅ User is authenticated

## Test Steps

### 1. Navigation Test
- Navigate to the Property tab
- Tap the "+" or "Post Property" button
- Verify the PostPropertyScreen loads with clean design and proper header

### 2. Form Validation Test
Try submitting the form with invalid data to test validation:

**Empty Form Test:**
- Leave all fields empty
- Tap "Post Property"
- Should show validation errors for required fields:
  - Property title is required
  - Valid price is required
  - Property address is required
  - At least one property image is required
  - Phone number or email is required

**Invalid Data Test:**
- Title: "abc" (too short)
- Price: "100" (too low)
- Address: "test" (too short)
- Phone: "123" (invalid format)
- Email: "invalid-email"
- Should show specific validation errors

### 3. Complete Form Test
Fill out the form with valid data:

**Required Fields:**
- ✅ Title: "Beautiful 2 Bedroom Apartment in Kilimani"
- ✅ Property Type: Select "Apartments"
- ✅ Price: "35000"
- ✅ Price Period: "Monthly"
- ✅ Address: "Kilimani Road, Near Yaya Centre, Nairobi"
- ✅ County: "Nairobi"
- ✅ At least 1 image from gallery
- ✅ Contact phone: "+254712345678"

**Optional Fields:**
- Description: "Spacious 2-bedroom apartment with modern finishes..."
- Town: "Nairobi"
- Neighborhood: "Kilimani"
- Bedrooms: "2"
- Bathrooms: "2"
- Area: "80"
- Amenities: Select 2-3 amenities
- Contact email: "test@example.com"

### 4. Image Upload Test
- Tap "Add Property Photos"
- Select 2-3 images from device gallery
- Verify images appear in the form
- Test removing an image
- Verify image count updates correctly

### 5. Form Submission Test
- Fill out complete form with valid data
- Tap "Post Property"
- Verify loading state shows (spinner in submit button)
- Should show success alert with property title
- Should navigate back to previous screen

### 6. Data Persistence Test
After successful submission:
- Navigate to Property listings
- Verify the new property appears at the top of the list
- Verify all submitted data is displayed correctly:
  - Title, price, location
  - Images are loaded properly
  - All details match submitted form

### 7. Backend Integration Test
Check the following in your Supabase dashboard:

**Database Check:**
- Go to Table Editor > property_listings
- Find the newly created property
- Verify all fields are populated correctly
- Check that location_coordinates has proper lat/lng

**Storage Check:**
- Go to Storage > property-images
- Find the uploaded images under the property ID folder
- Verify images are accessible via public URL

### 8. Redux State Test
In development console, check Redux state:
```javascript
// Should contain the new property
store.getState().property.listings[0]
store.getState().property.userProperties[0]
```

## Expected Results

### ✅ Success Criteria
1. Form validates all required fields properly
2. Images upload successfully to Supabase Storage
3. Property data is saved to Supabase database
4. Redux state is updated with new property
5. User sees success message and navigation works
6. New property appears in property listings immediately

### ❌ Common Issues & Solutions

**"Redux hooks not working":**
- Check that Redux Provider wraps the app (✅ confirmed in App.tsx)
- Verify import path: `import { useAppSelector, useAppDispatch } from '../../redux/hooks'`
- No duplicate imports (✅ fixed)

**"Supabase not configured":**
- Check .env file has correct SUPABASE_URL and SUPABASE_ANON_KEY
- Run: `npx tsx scripts/testSupabase.ts` to verify connection

**"Image upload fails":**
- Verify storage bucket exists and has correct policies
- Check file permissions in device settings
- Ensure images are under size limit (10MB)

**"Property creation fails":**
- Check database schema matches expected structure
- Verify RLS policies allow authenticated users to insert
- Check for required field violations in database

**"Property doesn't appear in listings":**
- Check Redux state update in property slice
- Verify fetch query includes new property
- Check property status is 'available'

## Performance Test
1. Test with multiple images (up to 10)
2. Test with long property descriptions (800+ characters)
3. Test form submission with slow network
4. Verify loading states work properly

## Cleanup
After testing, you may want to:
1. Delete test properties from database
2. Remove test images from storage
3. Clear Redux state if needed

## Notes
- All validation follows the enhanced rules implemented
- Image uploads are handled asynchronously with proper cleanup on failure
- Error handling provides specific user-friendly messages
- Success flow includes proper navigation and state updates