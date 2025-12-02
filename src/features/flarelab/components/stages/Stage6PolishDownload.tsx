import { useState, useEffect } from 'react';
import { Download, FileVideo, Image as ImageIcon, CheckCircle2, Package, RefreshCw } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import type { FlareLabProject, GeneratedImage, CreateProjectInput } from '../../types/project.types';

interface Stage6Props {
  project: FlareLabProject;
  navigateToStage: (stage: number) => void;
  createProject: (input: CreateProjectInput) => Promise<FlareLabProject | null>;
  loadProject: (projectId: string) => Promise<FlareLabProject | null>;
  markStageCompleted: (stageName: string, data?: any, additionalUpdates?: any) => Promise<FlareLabProject | null>;
}

interface ExportItem {
  id: string;
  type: 'image' | 'video';
  name: string;
  url: string;
  thumbnailUrl?: string;
  themeCategory?: string;
}

export const Stage6PolishDownload = ({ project, markStageCompleted }: Stage6Props) => {
  const [exportItems, setExportItems] = useState<ExportItem[]>([]);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [downloadingAll, setDownloadingAll] = useState(false);
  const [downloadedItems, setDownloadedItems] = useState<Set<string>>(new Set());
  const [isSaving, setIsSaving] = useState(false);

  // Load selected items from Stage 4 (images) and Stage 5 (videos)
  useEffect(() => {
    const items: ExportItem[] = [];

    // Get images selected for export from Stage 4
    const selectedImageIds = project.highFidelityCapture?.selectedForExport || [];
    const allImages = project.highFidelityCapture?.generatedImages || [];

    selectedImageIds.forEach(themeId => {
      const image = allImages.find((img: GeneratedImage) => img.themeId === themeId);
      if (image) {
        items.push({
          id: `image-${themeId}`,
          type: 'image',
          name: image.themeName || 'Image',
          url: image.url,
          thumbnailUrl: image.thumbnailUrl || image.url,
          themeCategory: image.themeCategory,
        });
      }
    });

    // Get videos selected for export from Stage 5
    const selectedVideoIds = project.kineticActivation?.selectedForExport || [];
    const allAnimations = project.kineticActivation?.animations || [];

    selectedVideoIds.forEach(themeId => {
      const animation = allAnimations.find((anim: any) => anim.themeId === themeId);
      if (animation?.video?.videoUrl) {
        items.push({
          id: `video-${themeId}`,
          type: 'video',
          name: animation.themeName || 'Video',
          url: animation.video.videoUrl,
          thumbnailUrl: animation.imageUrl,
          themeCategory: animation.themeCategory,
        });
      }
    });

    console.log('[Stage6] Export items loaded:', items.length);
    setExportItems(items);
  }, [project]);

  /**
   * Download a single file using backend proxy to avoid CORS
   */
  const downloadFile = async (item: ExportItem) => {
    setDownloadingId(item.id);

    try {
      // Generate filename
      const extension = item.type === 'video' ? 'mp4' : 'png';
      const safeName = item.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      const filename = `flarelab_${safeName}_${item.type}.${extension}`;

      // Use backend proxy to avoid CORS issues
      const proxyUrl = `/api/flarelab/download/proxy?url=${encodeURIComponent(item.url)}&filename=${encodeURIComponent(filename)}`;

      // Fetch through proxy
      const response = await fetch(proxyUrl);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to fetch file');
      }

      const blob = await response.blob();

      // Create download link
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;

      // Trigger download
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Cleanup
      window.URL.revokeObjectURL(downloadUrl);

      // Mark as downloaded
      setDownloadedItems(prev => new Set([...prev, item.id]));

    } catch (error) {
      console.error('[Stage6] Download failed:', error);
      alert(`Failed to download ${item.name}. Please try again.`);
    } finally {
      setDownloadingId(null);
    }
  };

  /**
   * Download all files
   */
  const downloadAll = async () => {
    setDownloadingAll(true);

    try {
      for (const item of exportItems) {
        await downloadFile(item);
        // Small delay between downloads
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    } catch (error) {
      console.error('[Stage6] Download all failed:', error);
    } finally {
      setDownloadingAll(false);
    }
  };

  /**
   * Mark project as complete
   */
  const handleFinishProject = async () => {
    try {
      setIsSaving(true);

      const polishDownloadData = {
        exportedItems: exportItems.map(item => ({
          id: item.id,
          type: item.type,
          name: item.name,
          url: item.url,
        })),
        exportedAt: new Date(),
        totalImages: exportItems.filter(i => i.type === 'image').length,
        totalVideos: exportItems.filter(i => i.type === 'video').length,
      };

      await markStageCompleted('polish-download', undefined, {
        polishDownload: polishDownloadData,
        status: 'complete',
      });

      alert('Project marked as complete!');
    } catch (error) {
      console.error('[Stage6] Failed to save:', error);
      alert('Failed to save. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const imageItems = exportItems.filter(i => i.type === 'image');
  const videoItems = exportItems.filter(i => i.type === 'video');
  const hasItems = exportItems.length > 0;
  const allDownloaded = exportItems.length > 0 && downloadedItems.size === exportItems.length;

  return (
    <div className="max-w-6xl mx-auto p-8 lg:p-12">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-12 h-12 rounded-xl bg-orange-500/20 flex items-center justify-center">
            <Download className="w-6 h-6 text-orange-500" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">Export & Download</h2>
            <p className="text-gray-400">Download your images and videos</p>
          </div>
        </div>

        {/* Summary */}
        {hasItems && (
          <div className="mt-4 p-4 bg-orange-500/10 border border-orange-500/30 rounded-xl">
            <div className="flex items-center gap-4">
              <Package className="w-5 h-5 text-orange-400" />
              <div className="flex-1">
                <p className="text-orange-300 text-sm">
                  <strong>{exportItems.length} items</strong> ready for export
                  ({imageItems.length} images, {videoItems.length} videos)
                </p>
              </div>
              <Button
                onClick={downloadAll}
                disabled={downloadingAll || downloadingId !== null}
                className="bg-orange-500 hover:bg-orange-600 text-white"
              >
                {downloadingAll ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Downloading...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 mr-2" />
                    Download All
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* No items message */}
      {!hasItems && (
        <div className="text-center py-16">
          <Package className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">No Items Selected for Export</h3>
          <p className="text-gray-400 mb-6">
            Go back to Stage 4 or Stage 5 and select items for export.
          </p>
        </div>
      )}

      {/* Images Section */}
      {imageItems.length > 0 && (
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-orange-400" />
            Images ({imageItems.length})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {imageItems.map((item) => (
              <div
                key={item.id}
                className="bg-[#151515] border border-gray-800 rounded-xl overflow-hidden"
              >
                <div className="aspect-video relative bg-gray-900">
                  <img
                    src={item.thumbnailUrl || item.url}
                    alt={item.name}
                    className="w-full h-full object-cover"
                  />
                  {downloadedItems.has(item.id) && (
                    <div className="absolute top-2 right-2 bg-orange-500 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      Downloaded
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <h4 className="text-white font-medium mb-2 truncate">{item.name}</h4>
                  {item.themeCategory && (
                    <p className="text-xs text-gray-500 mb-3">{item.themeCategory}</p>
                  )}
                  <Button
                    onClick={() => downloadFile(item)}
                    disabled={downloadingId === item.id || downloadingAll}
                    size="sm"
                    variant="outline"
                    className="w-full border-orange-500/50 text-orange-400 hover:bg-orange-500/10"
                  >
                    {downloadingId === item.id ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        Downloading...
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4 mr-2" />
                        Download Image
                      </>
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Videos Section */}
      {videoItems.length > 0 && (
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <FileVideo className="w-5 h-5 text-amber-400" />
            Videos ({videoItems.length})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {videoItems.map((item) => (
              <div
                key={item.id}
                className="bg-[#151515] border border-gray-800 rounded-xl overflow-hidden"
              >
                <div className="aspect-video relative bg-gray-900">
                  <video
                    src={item.url}
                    poster={item.thumbnailUrl}
                    className="w-full h-full object-cover"
                    controls
                    muted
                    loop
                    playsInline
                  />
                  {downloadedItems.has(item.id) && (
                    <div className="absolute top-2 right-2 bg-orange-500 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1 z-10">
                      <CheckCircle2 className="w-3 h-3" />
                      Downloaded
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <h4 className="text-white font-medium mb-2 truncate">{item.name}</h4>
                  {item.themeCategory && (
                    <p className="text-xs text-gray-500 mb-3">{item.themeCategory}</p>
                  )}
                  <Button
                    onClick={() => downloadFile(item)}
                    disabled={downloadingId === item.id || downloadingAll}
                    size="sm"
                    variant="outline"
                    className="w-full border-amber-500/50 text-amber-400 hover:bg-amber-500/10"
                  >
                    {downloadingId === item.id ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        Downloading...
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4 mr-2" />
                        Download Video
                      </>
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Finish Project Button */}
      {hasItems && (
        <div className="mt-8 p-4 bg-gray-800/50 border border-gray-700 rounded-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {allDownloaded ? (
                <>
                  <CheckCircle2 className="w-6 h-6 text-orange-400" />
                  <div>
                    <p className="text-white font-medium">All items downloaded!</p>
                    <p className="text-sm text-gray-400">You can now finish the project</p>
                  </div>
                </>
              ) : (
                <>
                  <Download className="w-6 h-6 text-gray-400" />
                  <div>
                    <p className="text-white font-medium">{downloadedItems.size} of {exportItems.length} downloaded</p>
                    <p className="text-sm text-gray-400">Download items before finishing</p>
                  </div>
                </>
              )}
            </div>
            <Button
              onClick={handleFinishProject}
              disabled={isSaving}
              className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-xl"
              size="lg"
            >
              {isSaving ? (
                <>
                  <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5 mr-2" />
                  Finish Project
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
