import type {DesktopCredentials} from './desktop-model-credentials';

declare global {
  interface Window {
    DouluoAndroidNative?: {
      accessKey(): string;
      version(): string;
      credentials(action: string, data: string): string;
      beginExport(): string;
      appendExport(id: string, data: string): boolean;
      finishExport(id: string, name: string, type: string): void;
      discardExport(id: string): void;
    };
  }
}

const bridge = typeof window === 'undefined' ? undefined : window.DouluoAndroidNative;
export const isAndroidGame = Boolean(bridge);
export const androidVersion = bridge?.version();
export const androidAccessHeader = 'X-Douluo-Device-Key';
export const androidAccessKey = bridge?.accessKey();

function credentialCall(action: string, value: unknown) {
  const reply = JSON.parse(bridge!.credentials(action, JSON.stringify(value)));
  if (reply.error) throw Error(reply.error);
  return reply.value;
}

export const androidCredentials: DesktopCredentials | undefined = bridge && {
  seal: async profiles => credentialCall('seal', profiles),
  resolve: async profile => credentialCall('resolve', profile),
  forget: async refs => { credentialCall('forget', refs); },
};

export async function androidSaveFile(blob: Blob, name: string) {
  const id = bridge!.beginExport();
  if (!id) throw Error('无法准备导出，请先完成上一次文件保存');
  try {
    for (let offset = 0; offset < blob.size; offset += 16384) {
      const bytes = new Uint8Array(await blob.slice(offset, offset + 16384).arrayBuffer());
      if (!bridge!.appendExport(id, btoa(String.fromCharCode(...bytes)))) throw Error('无法写入待导出的文件');
    }
    await new Promise<void>((resolve, reject) => {
      const event = 'douluo-android-export';
      const receive = (message: Event) => {
        const [received, status] = (message as CustomEvent<string[]>).detail;
        if (received !== id) return;
        window.removeEventListener(event, receive);
        if (status === 'saved') resolve();
        else reject(Error(status === 'cancelled' ? '已取消导出' : '文件保存失败，请选择其他位置'));
      };
      window.addEventListener(event, receive);
      try {
        bridge!.finishExport(id, name, blob.type);
      } catch (error) {
        window.removeEventListener(event, receive);
        reject(error);
      }
    });
  } finally {
    bridge!.discardExport(id);
  }
}
