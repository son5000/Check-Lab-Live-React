'use client';

import { User, Mail, Edit2, Check, X } from 'lucide-react';
import { useState } from 'react';

export function UserProfileSettings() {
  const [isEditing, setIsEditing] = useState(false);
  const [profile, setProfile] = useState({
    name: '관리자',
    email: 'admin@example.com',
    phone: '010-1234-5678',
    department: '설비관리팀',
  });
  const [editData, setEditData] = useState(profile);

  const handleSave = () => {
    setProfile(editData);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditData(profile);
    setIsEditing(false);
  };

  return (
    <div className="UserProfileSettings space-y-6">
      <div className="border-b border-border pb-6">
        <div className="mb-4 flex items-center gap-3">
          <User className="h-5 w-5 text-foreground" />
          <h2 className="text-lg font-semibold text-foreground">사용자 프로필</h2>
        </div>

        {!isEditing ? (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs text-muted-foreground">이름</p>
                <p className="mt-1 text-sm font-medium text-foreground">{profile.name}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">이메일</p>
                <p className="mt-1 flex items-center gap-2 text-sm font-medium text-foreground">
                  <Mail className="h-4 w-4" />
                  {profile.email}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">연락처</p>
                <p className="mt-1 text-sm font-medium text-foreground">{profile.phone}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">부서</p>
                <p className="mt-1 text-sm font-medium text-foreground">{profile.department}</p>
              </div>
            </div>
            <button
              onClick={() => setIsEditing(true)}
              className="mt-4 flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm font-medium text-foreground transition hover:bg-accent"
            >
              <Edit2 className="h-4 w-4" />
              프로필 수정
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-xs text-muted-foreground">이름</label>
                <input
                  type="text"
                  value={editData.name}
                  onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                  className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">이메일</label>
                <input
                  type="email"
                  value={editData.email}
                  onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                  className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">연락처</label>
                <input
                  type="tel"
                  value={editData.phone}
                  onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
                  className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">부서</label>
                <input
                  type="text"
                  value={editData.department}
                  onChange={(e) => setEditData({ ...editData, department: e.target.value })}
                  className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleSave}
                className="flex items-center gap-2 rounded-md border border-green-600 bg-green-600/10 px-3 py-2 text-sm font-medium text-green-600 transition hover:bg-green-600/20"
              >
                <Check className="h-4 w-4" />
                저장
              </button>
              <button
                onClick={handleCancel}
                className="flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm font-medium text-foreground transition hover:bg-accent"
              >
                <X className="h-4 w-4" />
                취소
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
