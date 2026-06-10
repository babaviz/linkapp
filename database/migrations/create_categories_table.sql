-- Categories Table Migration
-- This table stores all dynamic categories across modules (Property, Jobs, Services)
-- Allows automatic creation of new categories when items are added

-- Create categories table
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Module this category belongs to
    module TEXT NOT NULL CHECK (module IN ('property', 'job', 'service')),
    
    -- Category identifiers
    key TEXT NOT NULL, -- Unique key for the category (e.g., 'houses', 'apartments')
    name TEXT NOT NULL, -- Display name (e.g., 'Houses', 'Apartments')
    label TEXT NOT NULL, -- Short label for UI
    description TEXT,
    
    -- Visual properties
    icon TEXT, -- Emoji or icon identifier
    color TEXT, -- Primary color (hex)
    light_color TEXT, -- Light variant color (hex)
    
    -- Metadata
    count INTEGER DEFAULT 0, -- Number of items in this category
    is_active BOOLEAN DEFAULT TRUE,
    display_order INTEGER DEFAULT 999, -- Sort order for display
    
    -- Ensure unique category per module
    UNIQUE(module, key)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_categories_module ON public.categories(module);
CREATE INDEX IF NOT EXISTS idx_categories_key ON public.categories(key);
CREATE INDEX IF NOT EXISTS idx_categories_active ON public.categories(is_active);
CREATE INDEX IF NOT EXISTS idx_categories_display_order ON public.categories(display_order);

-- Enable Row Level Security
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- RLS Policies for categories
-- Anyone can view active categories
CREATE POLICY "Anyone can view active categories" 
    ON public.categories 
    FOR SELECT 
    USING (is_active = TRUE);

-- Only authenticated users can create categories
CREATE POLICY "Authenticated users can create categories" 
    ON public.categories 
    FOR INSERT 
    WITH CHECK (auth.uid() IS NOT NULL);

-- System can update category counts
CREATE POLICY "System can update categories" 
    ON public.categories 
    FOR UPDATE 
    USING (TRUE);

-- Trigger to update updated_at timestamp
CREATE TRIGGER handle_categories_updated_at 
    BEFORE UPDATE ON public.categories 
    FOR EACH ROW 
    EXECUTE PROCEDURE public.handle_updated_at();

-- Function to automatically update category counts
CREATE OR REPLACE FUNCTION public.update_category_count()
RETURNS TRIGGER AS $$
DECLARE
    cat_module TEXT;
    cat_key TEXT;
    new_count INTEGER;
BEGIN
    -- Determine module and category based on table
    IF TG_TABLE_NAME = 'property_listings' THEN
        cat_module := 'property';
        cat_key := COALESCE(NEW.property_type, OLD.property_type);
    ELSIF TG_TABLE_NAME = 'job_postings' THEN
        cat_module := 'job';
        cat_key := COALESCE(NEW.skill_category, OLD.skill_category);
    ELSIF TG_TABLE_NAME = 'service_listings' THEN
        cat_module := 'service';
        cat_key := COALESCE(NEW.category, OLD.category);
    ELSE
        RETURN NEW;
    END IF;

    -- Calculate new count for the category
    IF cat_module = 'property' THEN
        SELECT COUNT(*) INTO new_count
        FROM public.property_listings
        WHERE property_type = cat_key
        AND status = 'available';
    ELSIF cat_module = 'job' THEN
        SELECT COUNT(*) INTO new_count
        FROM public.job_postings
        WHERE skill_category = cat_key
        AND status = 'active';
    ELSIF cat_module = 'service' THEN
        SELECT COUNT(*) INTO new_count
        FROM public.service_listings
        WHERE category = cat_key
        AND status = 'active';
    END IF;

    -- Update category count
    UPDATE public.categories
    SET count = new_count,
        updated_at = NOW()
    WHERE module = cat_module
    AND key = cat_key;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers to automatically update category counts
CREATE TRIGGER update_property_category_count
    AFTER INSERT OR UPDATE OR DELETE ON public.property_listings
    FOR EACH ROW
    EXECUTE PROCEDURE public.update_category_count();

CREATE TRIGGER update_job_category_count
    AFTER INSERT OR UPDATE OR DELETE ON public.job_postings
    FOR EACH ROW
    EXECUTE PROCEDURE public.update_category_count();

CREATE TRIGGER update_service_category_count
    AFTER INSERT OR UPDATE OR DELETE ON public.service_listings
    FOR EACH ROW
    EXECUTE PROCEDURE public.update_category_count();

-- Insert default categories for Property module
INSERT INTO public.categories (module, key, name, label, description, icon, color, light_color, display_order) VALUES
    ('property', 'houses', 'Houses', 'Houses', 'Family homes & villas', '🏠', '#3B82F6', '#DBEAFE', 1),
    ('property', 'apartments', 'Apartments', 'Apartments', 'Modern complexes', '🏢', '#10B981', '#D1FAE5', 2),
    ('property', 'one_bedroom', '1 Bedroom', '1 Bedroom', 'Perfect for singles', '🛏️', '#F59E0B', '#FEF3C7', 3),
    ('property', 'two_bedroom', '2 Bedroom', '2 Bedroom', 'Ideal for couples', '🛏️', '#8B5CF6', '#EDE9FE', 4),
    ('property', 'three_bedroom', '3 Bedroom', '3 Bedroom', 'Family friendly', '🏠', '#EF4444', '#FEE2E2', 5),
    ('property', 'bedsitters', 'Bedsitters', 'Bedsitters', 'Studio living', '🛌', '#06B6D4', '#CFFAFE', 6),
    ('property', 'commercial', 'Commercial', 'Commercial', 'Shops & offices', '🏪', '#F97316', '#FED7AA', 7),
    ('property', 'industrial', 'Industrial', 'Industrial', 'Warehouses & parks', '🏭', '#84CC16', '#ECFCCB', 8),
    ('property', 'offices', 'Offices', 'Offices', 'Business centers', '🏢', '#6366F1', '#E0E7FF', 9),
    ('property', 'land_plots', 'Land/Plots', 'Land/Plots', 'Plots & acreage', '🏞️', '#DC2626', '#FEE2E2', 10)
ON CONFLICT (module, key) DO NOTHING;

-- Insert default categories for Job module
INSERT INTO public.categories (module, key, name, label, description, icon, color, light_color, display_order) VALUES
    ('job', 'technology', 'Technology', 'Technology', 'IT and tech jobs', '💻', '#3B82F6', '#DBEAFE', 1),
    ('job', 'healthcare', 'Healthcare', 'Healthcare', 'Medical and health jobs', '🏥', '#10B981', '#D1FAE5', 2),
    ('job', 'education', 'Education', 'Education', 'Teaching and training', '🎓', '#F59E0B', '#FEF3C7', 3),
    ('job', 'finance', 'Finance', 'Finance', 'Banking and accounting', '💰', '#8B5CF6', '#EDE9FE', 4),
    ('job', 'retail', 'Retail', 'Retail', 'Sales and customer service', '🛍️', '#EF4444', '#FEE2E2', 5),
    ('job', 'construction', 'Construction', 'Construction', 'Building and infrastructure', '🏗️', '#F97316', '#FED7AA', 6),
    ('job', 'hospitality', 'Hospitality', 'Hospitality', 'Hotels and restaurants', '🏨', '#06B6D4', '#CFFAFE', 7)
ON CONFLICT (module, key) DO NOTHING;

-- Insert default categories for Service module
INSERT INTO public.categories (module, key, name, label, description, icon, color, light_color, display_order) VALUES
    ('service', 'plumbing', 'Plumbing', 'Plumbing', 'Plumbing repairs and installation', '🔧', '#3B82F6', '#DBEAFE', 1),
    ('service', 'electrical', 'Electrical', 'Electrical', 'Electrical repairs and installation', '⚡', '#F59E0B', '#FEF3C7', 2),
    ('service', 'cleaning', 'Cleaning', 'Cleaning', 'Home and office cleaning', '🧹', '#10B981', '#D1FAE5', 3),
    ('service', 'moving', 'Moving', 'Moving', 'Relocation and transport', '📦', '#8B5CF6', '#EDE9FE', 4),
    ('service', 'catering', 'Catering', 'Catering', 'Food and event services', '🍽️', '#EF4444', '#FEE2E2', 5),
    ('service', 'photography', 'Photography', 'Photography', 'Photo and video services', '📷', '#F97316', '#FED7AA', 6)
ON CONFLICT (module, key) DO NOTHING;