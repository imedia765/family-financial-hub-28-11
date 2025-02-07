import { useProfileManagement } from "@/hooks/useProfileManagement";
import { ProfileCard } from "@/components/profile/ProfileCard";
import { BankDetailsCard } from "@/components/profile/BankDetailsCard";
import { PaymentHistoryCard } from "@/components/profile/PaymentHistoryCard";
import { FamilyMembersCard } from "@/components/profile/FamilyMembersCard";
import { AnnouncementsCard } from "@/components/profile/AnnouncementsCard";
import { DocumentsCard } from "@/components/profile/DocumentsCard";
import { FamilyMemberDialogs } from "@/components/profile/FamilyMemberDialogs";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Navigation } from "@/components/Navigation";
import { Camera } from "lucide-react";
import { captureAndSaveScreenshot } from "@/utils/screenshotUtils";
import { useToast } from "@/hooks/use-toast";

const Profile = () => {
  const { toast } = useToast();
  const {
    memberData,
    loading,
    error,
    isEditing,
    editedData,
    uploadingPhoto,
    validationErrors,
    saving,
    isAddFamilyMemberOpen,
    isEditFamilyMemberOpen,
    selectedFamilyMember,
    handleInputChange,
    handleSave,
    handleCancel,
    handleEdit,
    handlePhotoUpload,
    setIsAddFamilyMemberOpen,
    setIsEditFamilyMemberOpen,
    fetchData,
    handleAddFamilyMember,
    handleEditFamilyMember,
    handleDeleteFamilyMember,
    handleViewDocument,
    handleDownloadDocument
  } = useProfileManagement();

  // Mock data for announcements and documents
  const announcements = [
    {
      id: '1',
      title: 'System Maintenance',
      content: 'Scheduled maintenance this weekend',
      created_at: new Date().toISOString(),
      priority: 'medium' as const
    }
  ];

  const documents = [
    {
      id: '1',
      title: 'Member Handbook',
      type: 'PDF',
      size: '2.5MB',
      updated_at: new Date().toISOString(),
      url: '#'
    }
  ];

  const handleScreenshot = async (elementId: string, section: string) => {
    try {
      const url = await captureAndSaveScreenshot(elementId, `profile-${section}`);
      toast({
        title: "Screenshot captured",
        description: "The screenshot has been saved successfully.",
      });
      
      // Update documentation with the screenshot
      const { error } = await supabase
        .from('documentation_screenshots')
        .insert([
          {
            section,
            url,
            created_at: new Date().toISOString(),
          }
        ]);

      if (error) throw error;

    } catch (error) {
      toast({
        title: "Screenshot failed",
        description: "Failed to capture screenshot. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="pt-20 p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            <div className="flex justify-between items-center mb-8">
              <div className="h-8 w-48 bg-primary/10 animate-pulse rounded" />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <ProfileCard
                  memberData={null}
                  editedData={null}
                  isEditing={false}
                  validationErrors={{}}
                  uploadingPhoto={false}
                  saving={false}
                  onPhotoUpload={() => {}}
                  onInputChange={() => {}}
                  onSave={() => {}}
                  onCancel={() => {}}
                  onEdit={() => {}}
                />
                <PaymentHistoryCard memberData={null} isLoading={true} />
              </div>
              <div className="space-y-6">
                <Card className="p-6 animate-pulse">
                  <div className="h-4 w-3/4 bg-primary/10 rounded mb-4" />
                  <div className="space-y-2">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-12 bg-primary/5 rounded" />
                    ))}
                  </div>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="p-6 max-w-md">
          <h2 className="text-xl font-semibold mb-4">Error Loading Profile</h2>
          <p className="text-destructive mb-4">{error}</p>
          <Button onClick={fetchData}>Retry</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="pt-20 p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              Member Dashboard
            </h1>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div id="profile-section" className="relative">
                <Button 
                  variant="outline" 
                  size="icon"
                  className="absolute top-2 right-2 z-10"
                  onClick={() => handleScreenshot('profile-section', 'profile')}
                >
                  <Camera className="h-4 w-4" />
                </Button>
                <ProfileCard
                  memberData={memberData}
                  editedData={editedData}
                  isEditing={isEditing}
                  validationErrors={validationErrors}
                  uploadingPhoto={uploadingPhoto}
                  saving={saving}
                  onPhotoUpload={handlePhotoUpload}
                  onInputChange={handleInputChange}
                  onSave={handleSave}
                  onCancel={handleCancel}
                  onEdit={handleEdit}
                />
              </div>
              
              <div id="bank-details-section" className="relative">
                <Button 
                  variant="outline" 
                  size="icon"
                  className="absolute top-2 right-2 z-10"
                  onClick={() => handleScreenshot('bank-details-section', 'bank-details')}
                >
                  <Camera className="h-4 w-4" />
                </Button>
                <BankDetailsCard memberNumber={memberData?.member_number} />
              </div>
              
              <div id="family-members-section" className="relative">
                <Button 
                  variant="outline" 
                  size="icon"
                  className="absolute top-2 right-2 z-10"
                  onClick={() => handleScreenshot('family-members-section', 'family-members')}
                >
                  <Camera className="h-4 w-4" />
                </Button>
                <FamilyMembersCard
                  memberData={memberData}
                  onAddMember={() => setIsAddFamilyMemberOpen(true)}
                  onEditMember={(member) => {
                    selectedFamilyMember.current = member;
                    setIsEditFamilyMemberOpen(true);
                  }}
                  onDeleteMember={handleDeleteFamilyMember}
                />
              </div>
              
              <div id="payment-history-section" className="relative">
                <Button 
                  variant="outline" 
                  size="icon"
                  className="absolute top-2 right-2 z-10"
                  onClick={() => handleScreenshot('payment-history-section', 'payment-history')}
                >
                  <Camera className="h-4 w-4" />
                </Button>
                <PaymentHistoryCard memberData={memberData} isLoading={false} />
              </div>
            </div>
            
            <div className="space-y-6">
              <div id="announcements-section" className="relative">
                <Button 
                  variant="outline" 
                  size="icon"
                  className="absolute top-2 right-2 z-10"
                  onClick={() => handleScreenshot('announcements-section', 'announcements')}
                >
                  <Camera className="h-4 w-4" />
                </Button>
                <AnnouncementsCard announcements={announcements} />
              </div>
              
              <div id="documents-section" className="relative">
                <Button 
                  variant="outline" 
                  size="icon"
                  className="absolute top-2 right-2 z-10"
                  onClick={() => handleScreenshot('documents-section', 'documents')}
                >
                  <Camera className="h-4 w-4" />
                </Button>
                <DocumentsCard
                  documents={documents}
                  onView={handleViewDocument}
                  onDownload={handleDownloadDocument}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
      <FamilyMemberDialogs
        isAddOpen={isAddFamilyMemberOpen}
        isEditOpen={isEditFamilyMemberOpen}
        selectedFamilyMember={selectedFamilyMember}
        onAddOpenChange={setIsAddFamilyMemberOpen}
        onEditOpenChange={setIsEditFamilyMemberOpen}
        onAddSubmit={handleAddFamilyMember}
        onEditSubmit={handleEditFamilyMember}
      />
    </div>
  );
};

export default Profile;
