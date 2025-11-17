"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { useRouter } from "next/navigation"
import { 
  Eye, 
  Edit, 
  MoreHorizontal, 
  Ban, 
  UserCheck, 
  Trash2,
  Mail,
  CheckCircle,
  XCircle,
} from "lucide-react"
import { Link } from '@/i18n/routing'
import { toast } from "@/hooks/use-toast"
import { useTranslations } from 'next-intl'

interface UserActionsProps {
  userId: string
  userRole: string
  userStatus: string
  userEmail?: string
  viewLink?: string
}

export default function UserActions({ userId, userRole, userStatus, userEmail, viewLink }: UserActionsProps) {
  const t = useTranslations('dashboard')
  const tCommon = useTranslations('common')
  
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isBanDialogOpen, setIsBanDialogOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    role: userRole,
    status: userStatus || 'active'
  })
  const [isApproveDialogOpen, setIsApproveDialogOpen] = useState(false)
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false)
  const router = useRouter()

  const handleEdit = () => {
    setIsEditDialogOpen(true)
  }

  const handleSave = async () => {
    try {
      setLoading(true)
      
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          role: formData.role,
          status: formData.status
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to update user")
      }

      toast({
        title: t('userUpdated'),
        description: t('userUpdated'),
      })
      
      setIsEditDialogOpen(false)
      router.refresh()
    } catch (error: any) {
      toast({
        title: tCommon('error'),
        description: error.message || t('errorUpdatingUser'),
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleBan = async () => {
    try {
      setLoading(true)
      const newStatus = userStatus === 'banned' ? 'active' : 'banned'
      
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: newStatus
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to update user status")
      }

      toast({
        title: newStatus === 'banned' ? t('userBanned') : t('userUnbanned'),
        description: newStatus === 'banned' ? t('userBanned') : t('userUnbanned'),
      })
      
      setIsBanDialogOpen(false)
      router.refresh()
    } catch (error: any) {
      toast({
        title: tCommon('error'),
        description: error.message || t('errorBanningUser'),
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async () => {
    try {
      setLoading(true)
      
      const response = await fetch(`/api/admin/users/${userId}/approve`, {
        method: 'POST',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to approve user")
      }

      toast({
        title: t('userApproved') || 'User Approved',
        description: t('userApprovedSuccess') || 'User has been approved and can now log in.',
      })
      
      setIsApproveDialogOpen(false)
      router.refresh()
    } catch (error: any) {
      toast({
        title: tCommon('error'),
        description: error.message || t('errorApprovingUser') || 'Failed to approve user',
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleReject = async () => {
    try {
      setLoading(true)
      
      const response = await fetch(`/api/admin/users/${userId}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reason: 'Account registration rejected by admin'
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to reject user")
      }

      toast({
        title: t('userRejected') || 'User Rejected',
        description: t('userRejectedSuccess') || 'User has been rejected.',
      })
      
      setIsRejectDialogOpen(false)
      router.refresh()
    } catch (error: any) {
      toast({
        title: tCommon('error'),
        description: error.message || t('errorRejectingUser') || 'Failed to reject user',
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm(t('confirmDelete'))) {
      return
    }

    try {
      setLoading(true)
      
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to delete user")
      }

      toast({
        title: t('userDeleted'),
        description: t('userDeleted'),
      })
      
      router.refresh()
    } catch (error: any) {
      toast({
        title: tCommon('error'),
        description: error.message || t('errorDeletingUser'),
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div className="flex items-center justify-end space-x-2">
        {userStatus === 'pending' && (
          <>
            <Button 
              variant="default" 
              size="sm" 
              onClick={() => setIsApproveDialogOpen(true)}
              className="bg-green-600 hover:bg-green-700"
            >
              <CheckCircle className="w-4 h-4 mr-1" />
              {t('approve') || 'Approve'}
            </Button>
            <Button 
              variant="destructive" 
              size="sm" 
              onClick={() => setIsRejectDialogOpen(true)}
            >
              <XCircle className="w-4 h-4 mr-1" />
              {t('reject') || 'Reject'}
            </Button>
          </>
        )}
        <Button variant="outline" size="sm" asChild>
          <Link href={viewLink || `/admin/users/${userId}`}>
            <Eye className="w-4 h-4" />
          </Link>
        </Button>
        <Button variant="outline" size="sm" onClick={handleEdit}>
          <Edit className="w-4 h-4" />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>{t('actions')}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setIsBanDialogOpen(true)}>
              {userStatus === 'banned' ? (
                <>
                  <UserCheck className="w-4 h-4 mr-2" />
                  {t('unbanUser')}
                </>
              ) : (
                <>
                  <Ban className="w-4 h-4 mr-2" />
                  {t('banUser')}
                </>
              )}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => {
              if (userEmail) {
                window.location.href = `mailto:${userEmail}`
              } else {
                toast({
                  title: tCommon('error'),
                  description: "User email not available",
                  variant: "destructive",
                })
              }
            }}>
              <Mail className="w-4 h-4 mr-2" />
              {t('sendEmail') || 'Send Email'}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={handleDelete}
              className="text-red-600 focus:text-red-600"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              {t('deleteUser')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('editUser')}</DialogTitle>
            <DialogDescription>
              {t('updateUserRoleAndStatus') || 'Update user role and status'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="role">{t('role')}</Label>
              <Select
                value={formData.role}
                onValueChange={(value) => setFormData(prev => ({ ...prev, role: value }))}
              >
                <SelectTrigger id="role">
                  <SelectValue placeholder={t('selectRole') || 'Select role'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="student">{tCommon('students')}</SelectItem>
                  <SelectItem value="instructor">{tCommon('instructors')}</SelectItem>
                  <SelectItem value="admin">{t('admin')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="status">{tCommon('status')}</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))}
              >
                <SelectTrigger id="status">
                  <SelectValue placeholder={t('selectStatus') || 'Select status'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">{t('pending') || 'Pending'}</SelectItem>
                  <SelectItem value="approved">{t('approved') || 'Approved'}</SelectItem>
                  <SelectItem value="active">{t('active')}</SelectItem>
                  <SelectItem value="inactive">{t('inactive')}</SelectItem>
                  <SelectItem value="banned">{t('banned')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              {tCommon('cancel')}
            </Button>
            <Button onClick={handleSave} disabled={loading}>
              {loading ? tCommon('loading') : t('saveChanges')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Ban Dialog */}
      <Dialog open={isBanDialogOpen} onOpenChange={setIsBanDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {userStatus === 'banned' ? t('unbanUser') : t('banUser')}
            </DialogTitle>
            <DialogDescription>
              {userStatus === 'banned' 
                ? (t('confirmUnban') || 'Are you sure you want to unban this user? They will be able to access the platform again.')
                : (t('confirmBan') || 'Are you sure you want to ban this user? They will not be able to access the platform.')
              }
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsBanDialogOpen(false)}>
              {tCommon('cancel')}
            </Button>
            <Button onClick={handleBan} disabled={loading} variant={userStatus === 'banned' ? 'default' : 'destructive'}>
              {loading ? (tCommon('loading') || 'Processing...') : userStatus === 'banned' ? t('unbanUser') : t('banUser')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Approve Dialog */}
      <Dialog open={isApproveDialogOpen} onOpenChange={setIsApproveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('approveUser') || 'Approve User'}</DialogTitle>
            <DialogDescription>
              {t('confirmApprove') || 'Are you sure you want to approve this user? They will be able to log in and access the platform.'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsApproveDialogOpen(false)}>
              {tCommon('cancel')}
            </Button>
            <Button onClick={handleApprove} disabled={loading} className="bg-green-600 hover:bg-green-700">
              {loading ? (tCommon('loading') || 'Processing...') : (t('approve') || 'Approve')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('rejectUser') || 'Reject User'}</DialogTitle>
            <DialogDescription>
              {t('confirmReject') || 'Are you sure you want to reject this user? They will not be able to access the platform.'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRejectDialogOpen(false)}>
              {tCommon('cancel')}
            </Button>
            <Button onClick={handleReject} disabled={loading} variant="destructive">
              {loading ? (tCommon('loading') || 'Processing...') : (t('reject') || 'Reject')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}


