/**
 * Adaptor Settings Modal
 * Wrapper component to integrate AdaptorSettingsPage into the workflow
 */

import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { AdaptorSettingsPage } from './adaptor/AdaptorSettingsPage';

interface AdaptorSettingsModalProps {
  projectId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function AdaptorSettingsModal({ projectId, isOpen, onClose }: AdaptorSettingsModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>AI Adaptor & Prompt Settings</DialogTitle>
        </DialogHeader>
        <AdaptorSettingsPage projectId={projectId} onClose={onClose} />
      </DialogContent>
    </Dialog>
  );
}

export default AdaptorSettingsModal;
