/**
 * IPFS Client for file uploads and retrieval
 * Uses Pinata or Web3.Storage as IPFS gateway
 */

export interface IPFSUploadResult {
  cid: string;
  url: string;
  size: number;
}

export interface IPFSFile {
  name: string;
  content: Buffer | Blob | File;
  mimeType?: string;
}

class IPFSClient {
  private pinataApiKey: string | undefined;
  private pinataSecretKey: string | undefined;
  private web3StorageToken: string | undefined;

  constructor() {
    this.pinataApiKey = process.env.NEXT_PUBLIC_PINATA_API_KEY;
    this.pinataSecretKey = process.env.PINATA_SECRET_KEY;
    this.web3StorageToken = process.env.WEB3_STORAGE_TOKEN;
  }

  /**
   * Upload file to IPFS via Pinata
   */
  async uploadToPinata(file: IPFSFile): Promise<IPFSUploadResult> {
    if (!this.pinataApiKey || !this.pinataSecretKey) {
      throw new Error('Pinata API keys not configured');
    }

    const formData = new FormData();
    const blob = file.content instanceof Blob ? file.content : new Blob([file.content]);
    formData.append('file', blob, file.name);

    const metadata = JSON.stringify({
      name: file.name,
      keyvalues: {
        uploadedBy: 'MediTrustChain',
        timestamp: new Date().toISOString(),
      },
    });
    formData.append('pinataMetadata', metadata);

    const response = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
      method: 'POST',
      headers: {
        pinata_api_key: this.pinataApiKey,
        pinata_secret_api_key: this.pinataSecretKey,
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Pinata upload failed: ${response.statusText}`);
    }

    const data = await response.json();
    
    return {
      cid: data.IpfsHash,
      url: `https://gateway.pinata.cloud/ipfs/${data.IpfsHash}`,
      size: data.PinSize,
    };
  }

  /**
   * Upload file to IPFS via Web3.Storage
   */
  async uploadToWeb3Storage(file: IPFSFile): Promise<IPFSUploadResult> {
    if (!this.web3StorageToken) {
      throw new Error('Web3.Storage token not configured');
    }

    const formData = new FormData();
    const blob = file.content instanceof Blob ? file.content : new Blob([file.content]);
    formData.append('file', blob, file.name);

    const response = await fetch('https://api.web3.storage/upload', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.web3StorageToken}`,
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Web3.Storage upload failed: ${response.statusText}`);
    }

    const data = await response.json();
    
    return {
      cid: data.cid,
      url: `https://w3s.link/ipfs/${data.cid}`,
      size: 0, // Web3.Storage doesn't return size
    };
  }

  /**
   * Upload JSON data to IPFS
   */
  async uploadJSON(data: Record<string, unknown>, filename = 'data.json'): Promise<IPFSUploadResult> {
    const jsonString = JSON.stringify(data, null, 2);
    const buffer = Buffer.from(jsonString, 'utf-8');

    const file: IPFSFile = {
      name: filename,
      content: buffer,
      mimeType: 'application/json',
    };

    // Try Pinata first, fallback to Web3.Storage
    try {
      return await this.uploadToPinata(file);
    } catch (error) {
      console.warn('Pinata upload failed, trying Web3.Storage:', error);
      return await this.uploadToWeb3Storage(file);
    }
  }

  /**
   * Upload file (generic method)
   */
  async upload(file: IPFSFile): Promise<IPFSUploadResult> {
    // Try Pinata first, fallback to Web3.Storage
    try {
      return await this.uploadToPinata(file);
    } catch (error) {
      console.warn('Pinata upload failed, trying Web3.Storage:', error);
      return await this.uploadToWeb3Storage(file);
    }
  }

  /**
   * Retrieve file from IPFS
   */
  async retrieve(cid: string): Promise<Response> {
    // Try multiple gateways for reliability
    const gateways = [
      `https://gateway.pinata.cloud/ipfs/${cid}`,
      `https://w3s.link/ipfs/${cid}`,
      `https://ipfs.io/ipfs/${cid}`,
      `https://cloudflare-ipfs.com/ipfs/${cid}`,
    ];

    for (const gateway of gateways) {
      try {
        const response = await fetch(gateway, { signal: AbortSignal.timeout(5000) });
        if (response.ok) {
          return response;
        }
      } catch (error) {
        console.warn(`Gateway ${gateway} failed:`, error);
      }
    }

    throw new Error(`Failed to retrieve file from IPFS: ${cid}`);
  }

  /**
   * Retrieve JSON data from IPFS
   */
  async retrieveJSON<T = Record<string, unknown>>(cid: string): Promise<T> {
    const response = await this.retrieve(cid);
    return await response.json();
  }
}

// Export singleton instance
export const ipfsClient = new IPFSClient();

// Helper function to check if IPFS is configured
export function isIPFSConfigured(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_PINATA_API_KEY ||
    process.env.WEB3_STORAGE_TOKEN
  );
}
