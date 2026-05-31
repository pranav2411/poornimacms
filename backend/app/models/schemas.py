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
    room: str
    category: str
    title: str
    description: str
    status: ComplaintStatus
    priority: ComplaintPriority
    assignedTo: Optional[str] = None
    timeline: List[ComplaintTimelineItem] = []
    createdAt: str
    updatedAt: str
    workCompleted: Optional[bool] = None
    otpVerified: Optional[bool] = None
    lastReminderSent: Optional[str] = None
    closeReason: Optional[str] = None


class ComplaintCreate(BaseModel):
    room: str = Field(..., min_length=1, max_length=50)
    category: str = Field(..., min_length=2, max_length=60)
    title: str = Field(..., min_length=3, max_length=120)
    description: str = Field(..., min_length=8, max_length=2000)
    priority: ComplaintPriority


class AssignVendorRequest(BaseModel):
    vendor: str = Field(..., min_length=2, max_length=120)


class CloseComplaintRequest(BaseModel):
    reason: str = Field(..., min_length=3, max_length=1000)


class VerifyOtpRequest(BaseModel):
    otp: str = Field(..., min_length=6, max_length=6)


class ReportIssueRequest(BaseModel):
    reason: str = Field(..., min_length=3, max_length=200)
    details: Optional[str] = Field(default=None, max_length=1200)


class StatItem(BaseModel):
    label: str
    value: int


class StatsResponse(BaseModel):
    stats: List[StatItem]


class NotificationItem(BaseModel):
    id: str
    title: str
    timestamp: str


class VendorItem(BaseModel):
    name: str
