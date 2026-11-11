import { verifiedFetch } from '@helia/verified-fetch';


export const fetchIPFSBlobUrl = async (cid: string): Promise<string> => {
  const response = await verifiedFetch(`ipfs://${cid}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch IPFS content: ${response.status} ${response.statusText}`);
  }
  const blob = await response.blob();
  return URL.createObjectURL(blob);
};

export const isImageCID = (cid: string): boolean => {
  const lower = cid.toLowerCase();
  return (
    lower.endsWith('.png') ||
    lower.endsWith('.jpg') ||
    lower.endsWith('.jpeg') ||
    lower.endsWith('.gif') ||
    lower.endsWith('.webp') ||
    lower.endsWith('.svg')
  );
};