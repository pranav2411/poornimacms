-- Complaint Management System Schema
-- Firebase Auth + Supabase PostgreSQL + Cloudinary

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(150) UNIQUE NOT NULL,
  code VARCHAR(10) UNIQUE NOT NULL,
  logo_url TEXT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE organization_sequences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  entity_type VARCHAR(30) NOT NULL, -- 'USR', 'NTF', 'CMP'
  last_value INT DEFAULT 0,
  UNIQUE(organization_id, entity_type)
);

CREATE TABLE departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  head_user_id UUID NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(organization_id, name)
);

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  user_no VARCHAR(50) UNIQUE NOT NULL,
  firebase_uid VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(150) NOT NULL,
  avatar_url TEXT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  role VARCHAR(30) NOT NULL CHECK (
    role IN ('faculty','admin','vendor','super_admin')
  ),
  department_id UUID NULL,
  is_verified BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  status VARCHAR(30) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE department_admins (
  department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  admin_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY (department_id, admin_id)
);

CREATE TABLE department_vendors (
  department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  vendor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY (department_id, vendor_id)
);

CREATE TABLE complaints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  complaint_no VARCHAR(30) UNIQUE NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  location TEXT NOT NULL,
  department_id UUID NOT NULL,
  priority VARCHAR(20) NOT NULL CHECK (
    priority IN ('low','medium','high')
  ),
  status VARCHAR(30) NOT NULL DEFAULT 'open' CHECK (
    status IN (
      'open',
      'vendor_assigned',
      'in_progress',
      'done',
      'resolved',
      'cancelled'
    )
  ),
  created_by UUID NOT NULL,
  assigned_vendor_id UUID NULL,
  cancellation_reason TEXT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  resolved_at TIMESTAMP NULL,
  cancelled_at TIMESTAMP NULL,
  vendor_change_requested BOOLEAN DEFAULT FALSE,
  vendor_change_reason TEXT NULL
);

CREATE TABLE complaint_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_id UUID NOT NULL,
  public_id VARCHAR(255) NOT NULL,
  secure_url TEXT NOT NULL,
  uploaded_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE complaint_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_id UUID NOT NULL,
  vendor_id UUID NOT NULL,
  assigned_by UUID NOT NULL,
  assigned_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE complaint_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_id UUID NOT NULL,
  old_status VARCHAR(30),
  new_status VARCHAR(30),
  remarks TEXT,
  changed_by UUID NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  notification_no VARCHAR(50) UNIQUE NOT NULL,
  user_id UUID NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE sos_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  triggered_by UUID NOT NULL,
  location TEXT,
  message TEXT,
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW(),
  closed_at TIMESTAMP NULL
);

-- Foreign Keys

ALTER TABLE users
ADD CONSTRAINT fk_users_department
FOREIGN KEY (department_id)
REFERENCES departments(id);

ALTER TABLE departments
ADD CONSTRAINT fk_department_head
FOREIGN KEY (head_user_id)
REFERENCES users(id);

ALTER TABLE complaints
ADD CONSTRAINT fk_complaint_department
FOREIGN KEY (department_id)
REFERENCES departments(id);

ALTER TABLE complaints
ADD CONSTRAINT fk_complaint_creator
FOREIGN KEY (created_by)
REFERENCES users(id);

ALTER TABLE complaints
ADD CONSTRAINT fk_complaint_vendor
FOREIGN KEY (assigned_vendor_id)
REFERENCES users(id);

ALTER TABLE complaint_images
ADD CONSTRAINT fk_image_complaint
FOREIGN KEY (complaint_id)
REFERENCES complaints(id)
ON DELETE CASCADE;

ALTER TABLE complaint_assignments
ADD CONSTRAINT fk_assignment_complaint
FOREIGN KEY (complaint_id)
REFERENCES complaints(id)
ON DELETE CASCADE;

ALTER TABLE complaint_assignments
ADD CONSTRAINT fk_assignment_vendor
FOREIGN KEY (vendor_id)
REFERENCES users(id);

ALTER TABLE complaint_assignments
ADD CONSTRAINT fk_assignment_admin
FOREIGN KEY (assigned_by)
REFERENCES users(id);

ALTER TABLE complaint_status_history
ADD CONSTRAINT fk_history_complaint
FOREIGN KEY (complaint_id)
REFERENCES complaints(id)
ON DELETE CASCADE;

ALTER TABLE complaint_status_history
ADD CONSTRAINT fk_history_user
FOREIGN KEY (changed_by)
REFERENCES users(id);

ALTER TABLE notifications
ADD CONSTRAINT fk_notification_user
FOREIGN KEY (user_id)
REFERENCES users(id);

ALTER TABLE sos_alerts
ADD CONSTRAINT fk_sos_user
FOREIGN KEY (triggered_by)
REFERENCES users(id);

-- Recommended Indexes

CREATE INDEX idx_complaints_status ON complaints(status);
CREATE INDEX idx_complaints_department ON complaints(department_id);
CREATE INDEX idx_complaints_priority ON complaints(priority);
CREATE INDEX idx_complaints_created_by ON complaints(created_by);
CREATE INDEX idx_complaints_vendor ON complaints(assigned_vendor_id);

CREATE INDEX idx_history_complaint ON complaint_status_history(complaint_id);
CREATE INDEX idx_assignment_complaint ON complaint_assignments(complaint_id);
CREATE INDEX idx_notifications_user ON notifications(user_id);

-- Reports Table
CREATE TABLE reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_id UUID NOT NULL,
  reported_by UUID NOT NULL,
  reason VARCHAR(255) NOT NULL,
  details TEXT,
  assigned_vendor_id UUID,
  assigned_admin_id UUID,
  created_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE reports
ADD CONSTRAINT fk_reports_complaint
FOREIGN KEY (complaint_id)
REFERENCES complaints(id)
ON DELETE CASCADE;

ALTER TABLE reports
ADD CONSTRAINT fk_reports_reporter
FOREIGN KEY (reported_by)
REFERENCES users(id);

ALTER TABLE reports
ADD CONSTRAINT fk_reports_vendor
FOREIGN KEY (assigned_vendor_id)
REFERENCES users(id);

ALTER TABLE reports
ADD CONSTRAINT fk_reports_admin
FOREIGN KEY (assigned_admin_id)
REFERENCES users(id);

CREATE INDEX idx_reports_complaint ON reports(complaint_id);
CREATE INDEX idx_reports_vendor ON reports(assigned_vendor_id);
CREATE INDEX idx_reports_admin ON reports(assigned_admin_id);


-- FCM Tokens Table
CREATE TABLE IF NOT EXISTS fcm_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fcm_tokens_user ON fcm_tokens(user_id);


-- Stored Function for Atomic Sequence Generation
CREATE OR REPLACE FUNCTION get_next_sequence(p_org_id UUID, p_entity_type VARCHAR)
RETURNS INT AS $$
DECLARE
  v_seq INT;
BEGIN
  INSERT INTO organization_sequences (organization_id, entity_type, last_value)
  VALUES (p_org_id, p_entity_type, 1)
  ON CONFLICT (organization_id, entity_type)
  DO UPDATE SET last_value = organization_sequences.last_value + 1
  RETURNING last_value INTO v_seq;
  
  RETURN v_seq;
END;
$$ LANGUAGE plpgsql;


