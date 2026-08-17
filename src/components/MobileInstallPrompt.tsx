import { useEffect, useState } from 'react';
import { Button, Modal } from 'react-bootstrap';
import { FaDownload, FaShareSquare } from 'react-icons/fa';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
}

interface NavigatorWithStandalone extends Navigator {
  standalone?: boolean;
}

function isRunningStandalone() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as NavigatorWithStandalone).standalone === true
  );
}

function getMobilePlatform() {
  const userAgent = window.navigator.userAgent;
  const isIPhone = /iPhone|iPod/i.test(userAgent);
  const isAndroidPhone = /Android/i.test(userAgent) && /Mobile/i.test(userAgent);

  return { isIPhone, isAndroidPhone };
}

export default function MobileInstallPrompt() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIosInstructions, setShowIosInstructions] = useState(false);
  const [isInstalled, setIsInstalled] = useState(() => isRunningStandalone());
  const { isIPhone, isAndroidPhone } = getMobilePlatform();

  useEffect(() => {
    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setInstallPrompt(null);
      setShowIosInstructions(false);
      setIsInstalled(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  if (isInstalled || (!isIPhone && (!isAndroidPhone || !installPrompt))) {
    return null;
  }

  const handleInstall = async () => {
    if (isIPhone) {
      setShowIosInstructions(true);
      return;
    }

    if (!installPrompt) {
      return;
    }

    await installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    setInstallPrompt(null);

    if (outcome === 'accepted') {
      setIsInstalled(true);
    }
  };

  return (
    <>
      <Button
        type="button"
        variant="primary"
        className="position-fixed bottom-0 end-0 m-3 d-flex align-items-center gap-2 shadow"
        style={{ zIndex: 1030 }}
        onClick={handleInstall}
        aria-label="Instalar Business Cloud en este teléfono"
      >
        <FaDownload aria-hidden="true" />
        Instalar app
      </Button>

      <Modal
        show={showIosInstructions}
        onHide={() => setShowIosInstructions(false)}
        centered
        aria-labelledby="ios-install-title"
      >
        <Modal.Header closeButton>
          <Modal.Title id="ios-install-title">Instalar en iPhone</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>Para agregar Business Cloud a tu pantalla de inicio desde Safari:</p>
          <ol className="mb-0 ps-3">
            <li className="mb-2">
              Toca el botón <FaShareSquare className="mx-1 text-primary" aria-label="Compartir" />{' '}
              <strong>Compartir</strong> en la barra de Safari.
            </li>
            <li className="mb-2">
              Desliza las opciones y selecciona <strong>Agregar a pantalla de inicio</strong>.
            </li>
            <li>
              Toca <strong>Agregar</strong> para confirmar.
            </li>
          </ol>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="primary" onClick={() => setShowIosInstructions(false)}>
            Entendido
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}
