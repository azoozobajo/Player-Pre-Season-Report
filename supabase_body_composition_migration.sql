-- Migration: Expand body_composition_records table
-- Run this in Supabase SQL Editor

-- Basic
ALTER TABLE body_composition_records ADD COLUMN IF NOT EXISTS ffmi NUMERIC;

-- Body Composition ranges (value columns exist, add range columns)
ALTER TABLE body_composition_records ADD COLUMN IF NOT EXISTS fat_free_mass_kg NUMERIC;
ALTER TABLE body_composition_records ADD COLUMN IF NOT EXISTS fat_free_mass_min NUMERIC;
ALTER TABLE body_composition_records ADD COLUMN IF NOT EXISTS fat_free_mass_max NUMERIC;
ALTER TABLE body_composition_records ADD COLUMN IF NOT EXISTS body_fat_percentage_min NUMERIC;
ALTER TABLE body_composition_records ADD COLUMN IF NOT EXISTS body_fat_percentage_max NUMERIC;
ALTER TABLE body_composition_records ADD COLUMN IF NOT EXISTS muscle_mass_min NUMERIC;
ALTER TABLE body_composition_records ADD COLUMN IF NOT EXISTS muscle_mass_max NUMERIC;
ALTER TABLE body_composition_records ADD COLUMN IF NOT EXISTS body_fat_mass_kg NUMERIC;
ALTER TABLE body_composition_records ADD COLUMN IF NOT EXISTS body_fat_mass_min NUMERIC;
ALTER TABLE body_composition_records ADD COLUMN IF NOT EXISTS body_fat_mass_max NUMERIC;
ALTER TABLE body_composition_records ADD COLUMN IF NOT EXISTS soft_lean_mass_kg NUMERIC;
ALTER TABLE body_composition_records ADD COLUMN IF NOT EXISTS soft_lean_mass_min NUMERIC;
ALTER TABLE body_composition_records ADD COLUMN IF NOT EXISTS soft_lean_mass_max NUMERIC;

-- Biological
ALTER TABLE body_composition_records ADD COLUMN IF NOT EXISTS total_body_water_kg NUMERIC;
ALTER TABLE body_composition_records ADD COLUMN IF NOT EXISTS total_body_water_min NUMERIC;
ALTER TABLE body_composition_records ADD COLUMN IF NOT EXISTS total_body_water_max NUMERIC;
ALTER TABLE body_composition_records ADD COLUMN IF NOT EXISTS protein_kg NUMERIC;
ALTER TABLE body_composition_records ADD COLUMN IF NOT EXISTS protein_min NUMERIC;
ALTER TABLE body_composition_records ADD COLUMN IF NOT EXISTS protein_max NUMERIC;
ALTER TABLE body_composition_records ADD COLUMN IF NOT EXISTS mineral_kg NUMERIC;
ALTER TABLE body_composition_records ADD COLUMN IF NOT EXISTS mineral_min NUMERIC;
ALTER TABLE body_composition_records ADD COLUMN IF NOT EXISTS mineral_max NUMERIC;
ALTER TABLE body_composition_records ADD COLUMN IF NOT EXISTS bmr_kcal NUMERIC;
ALTER TABLE body_composition_records ADD COLUMN IF NOT EXISTS visceral_fat_index NUMERIC;
ALTER TABLE body_composition_records ADD COLUMN IF NOT EXISTS visceral_fat_min NUMERIC;
ALTER TABLE body_composition_records ADD COLUMN IF NOT EXISTS visceral_fat_max NUMERIC;
ALTER TABLE body_composition_records ADD COLUMN IF NOT EXISTS tee_kcal NUMERIC;

-- Segment Lean Mass
ALTER TABLE body_composition_records ADD COLUMN IF NOT EXISTS left_arm_lean_kg NUMERIC;
ALTER TABLE body_composition_records ADD COLUMN IF NOT EXISTS left_arm_lean_min NUMERIC;
ALTER TABLE body_composition_records ADD COLUMN IF NOT EXISTS left_arm_lean_max NUMERIC;
ALTER TABLE body_composition_records ADD COLUMN IF NOT EXISTS right_arm_lean_kg NUMERIC;
ALTER TABLE body_composition_records ADD COLUMN IF NOT EXISTS right_arm_lean_min NUMERIC;
ALTER TABLE body_composition_records ADD COLUMN IF NOT EXISTS right_arm_lean_max NUMERIC;
ALTER TABLE body_composition_records ADD COLUMN IF NOT EXISTS trunk_lean_kg NUMERIC;
ALTER TABLE body_composition_records ADD COLUMN IF NOT EXISTS trunk_lean_min NUMERIC;
ALTER TABLE body_composition_records ADD COLUMN IF NOT EXISTS trunk_lean_max NUMERIC;
ALTER TABLE body_composition_records ADD COLUMN IF NOT EXISTS left_leg_lean_kg NUMERIC;
ALTER TABLE body_composition_records ADD COLUMN IF NOT EXISTS left_leg_lean_min NUMERIC;
ALTER TABLE body_composition_records ADD COLUMN IF NOT EXISTS left_leg_lean_max NUMERIC;
ALTER TABLE body_composition_records ADD COLUMN IF NOT EXISTS right_leg_lean_kg NUMERIC;
ALTER TABLE body_composition_records ADD COLUMN IF NOT EXISTS right_leg_lean_min NUMERIC;
ALTER TABLE body_composition_records ADD COLUMN IF NOT EXISTS right_leg_lean_max NUMERIC;

-- Segment Fat Mass
ALTER TABLE body_composition_records ADD COLUMN IF NOT EXISTS left_arm_fat_kg NUMERIC;
ALTER TABLE body_composition_records ADD COLUMN IF NOT EXISTS left_arm_fat_min NUMERIC;
ALTER TABLE body_composition_records ADD COLUMN IF NOT EXISTS left_arm_fat_max NUMERIC;
ALTER TABLE body_composition_records ADD COLUMN IF NOT EXISTS right_arm_fat_kg NUMERIC;
ALTER TABLE body_composition_records ADD COLUMN IF NOT EXISTS right_arm_fat_min NUMERIC;
ALTER TABLE body_composition_records ADD COLUMN IF NOT EXISTS right_arm_fat_max NUMERIC;
ALTER TABLE body_composition_records ADD COLUMN IF NOT EXISTS trunk_fat_kg NUMERIC;
ALTER TABLE body_composition_records ADD COLUMN IF NOT EXISTS trunk_fat_min NUMERIC;
ALTER TABLE body_composition_records ADD COLUMN IF NOT EXISTS trunk_fat_max NUMERIC;
ALTER TABLE body_composition_records ADD COLUMN IF NOT EXISTS left_leg_fat_kg NUMERIC;
ALTER TABLE body_composition_records ADD COLUMN IF NOT EXISTS left_leg_fat_min NUMERIC;
ALTER TABLE body_composition_records ADD COLUMN IF NOT EXISTS left_leg_fat_max NUMERIC;
ALTER TABLE body_composition_records ADD COLUMN IF NOT EXISTS right_leg_fat_kg NUMERIC;
ALTER TABLE body_composition_records ADD COLUMN IF NOT EXISTS right_leg_fat_min NUMERIC;
ALTER TABLE body_composition_records ADD COLUMN IF NOT EXISTS right_leg_fat_max NUMERIC;

-- Girth (cm)
ALTER TABLE body_composition_records ADD COLUMN IF NOT EXISTS left_upper_arm_cm NUMERIC;
ALTER TABLE body_composition_records ADD COLUMN IF NOT EXISTS right_upper_arm_cm NUMERIC;
ALTER TABLE body_composition_records ADD COLUMN IF NOT EXISTS shoulder_width_cm NUMERIC;
ALTER TABLE body_composition_records ADD COLUMN IF NOT EXISTS hip_cm NUMERIC;
ALTER TABLE body_composition_records ADD COLUMN IF NOT EXISTS waist_hip_ratio NUMERIC;
ALTER TABLE body_composition_records ADD COLUMN IF NOT EXISTS left_thigh_cm NUMERIC;
ALTER TABLE body_composition_records ADD COLUMN IF NOT EXISTS right_thigh_cm NUMERIC;
