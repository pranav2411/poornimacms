from __future__ import annotations

from typing import List, Optional

from pydantic import BaseModel, Field


ComplaintStatus = str
ComplaintPriority = str


class ComplaintTimelineItem(BaseModel):
    label: str = Field(..., min_length=2, max_length=120)
    time: str
    remarks: Optional[str] = Field(default=None, max_length=500)


class Complaint(BaseModel):
    id: str
    complaintNo: str
    title: str
    description: str
    location: str
    room: str
    category: Optional[str] = None
    departmentId: str
    status: ComplaintStatus
    priority: ComplaintPriority
    createdBy: str
    createdByName: Optional[str] = None
    images: List[str] = []
    fixImages: List[str] = []
    assignedTo: Optional[str] = None
    assignedVendorId: Optional[str] = None
    cancellationReason: Optional[str] = None
    resolvedAt: Optional[str] = None
    cancelledAt: Optional[str] = None
    timeline: List[ComplaintTimelineItem] = []
    createdAt: str
    updatedAt: str
    workCompleted: Optional[bool] = None
    closeReason: Optional[str] = None
    lastReminderSent: Optional[str] = None
    vendorChangeRequested: Optional[bool] = None
    vendorChangeReason: Optional[str] = None


class ComplaintCreate(BaseModel):
    location: str = Field(..., min_length=1, max_length=255)
    departmentId: str = Field(..., min_length=1)
    title: str = Field(..., min_length=3, max_length=120)
    description: str = Field(..., min_length=8, max_length=2000)
    priority: ComplaintPriority
    createdBy: str = Field(..., min_length=1)
    images: Optional[List[str]] = None


class ComplaintUpdate(BaseModel):
    title: Optional[str] = Field(default=None, min_length=3, max_length=120)
    description: Optional[str] = Field(default=None, min_length=8, max_length=2000)
    location: Optional[str] = Field(default=None, min_length=1, max_length=255)
    priority: Optional[ComplaintPriority] = None



class AssignVendorRequest(BaseModel):
    vendor: str = Field(..., min_length=1)
    assignedBy: Optional[str] = Field(default=None, min_length=1)


class MarkFixedRequest(BaseModel):
    remarks: Optional[str] = Field(default=None, max_length=500)
    image: Optional[str] = Field(default=None)



class CloseComplaintRequest(BaseModel):
    reason: str = Field(..., min_length=3, max_length=1000)


class ReportIssueRequest(BaseModel):
    reason: str = Field(..., min_length=3, max_length=200)
    details: Optional[str] = Field(default=None, max_length=1200)


class RequestVendorChangeRequest(BaseModel):
    reason: str = Field(..., min_length=3, max_length=500)


class StatItem(BaseModel):
    label: str
    value: int


class StatsResponse(BaseModel):
    stats: List[StatItem]
    avgResolutionTime: Optional[float] = None


class NotificationItem(BaseModel):
    id: str
    title: str
    timestamp: str


class VendorItem(BaseModel):
    id: str
    name: str
    email: Optional[str] = None
    departmentId: Optional[str] = None
    avgResolutionTime: Optional[str] = None
    activeComplaints: int = 0


class AddVendorRequest(BaseModel):
    email: str
    name: str
    departmentId: str


class UserCreate(BaseModel):
    firebaseUid: Optional[str] = Field(default=None, max_length=255)
    name: Optional[str] = Field(default=None, max_length=150)
    avatarUrl: Optional[str] = Field(default=None, max_length=1000)
    email: str = Field(..., min_length=5, max_length=255)
    role: str = Field(..., min_length=3, max_length=30)
    departmentId: Optional[str] = None
    isVerified: bool = False
    isActive: bool = True


class UserUpdate(BaseModel):
    firebaseUid: Optional[str] = Field(default=None, max_length=255)
    name: Optional[str] = Field(default=None, min_length=2, max_length=150)
    avatarUrl: Optional[str] = Field(default=None, max_length=1000)
    email: Optional[str] = Field(default=None, min_length=5, max_length=255)
    role: Optional[str] = Field(default=None, min_length=3, max_length=30)
    departmentId: Optional[str] = None
    isVerified: Optional[bool] = None
    isActive: Optional[bool] = None


class UserItem(BaseModel):
    id: str
    firebaseUid: Optional[str] = None
    name: Optional[str] = None
    avatarUrl: Optional[str] = None
    email: str
    role: Optional[str] = None
    departmentId: Optional[str] = None
    isVerified: bool
    isActive: bool
    createdAt: str
    updatedAt: str


class SosAlertCreate(BaseModel):
    triggeredBy: str = Field(..., min_length=1)
    emergencyType: str = Field(..., min_length=3, max_length=50)
    location: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = Field(default=None, max_length=1000)


class SosAlertHistoryItem(BaseModel):
    id: str
    triggeredBy: str
    triggeredByName: str
    triggeredByEmail: str
    location: Optional[str] = None
    message: Optional[str] = None
    status: str
    createdAt: str
    closedAt: Optional[str] = None


class RegisterFCMTokenRequest(BaseModel):
    userId: str = Field(..., min_length=1)
    token: str = Field(..., min_length=1)


class NotifyPendingUserRequest(BaseModel):
    email: str = Field(..., min_length=5)
    name: str = Field(default="")


