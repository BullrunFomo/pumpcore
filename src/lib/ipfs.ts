import FormData from "form-data";
import axios from "axios";

const PINATA_JWT = process.env.PINATA_JWT || "";
const PINATA_GATEWAY = process.env.PINATA_GATEWAY || "https://gateway.pinata.cloud";

export interface UploadMetadataParams {
  name: string;
  symbol: string;
  logoBuffer: Buffer;
  logoFileName: string;
  description?: string;
  website?: string;
  twitter?: string;
  telegram?: string;
}

export async function uploadImageToPinata(
  buffer: Buffer,
  fileName: string
): Promise<string> {
  const formData = new FormData();
  formData.append("file", buffer, {
    filename: fileName,
    contentType: "image/png",
  });
  formData.append(
    "pinataMetadata",
    JSON.stringify({ name: fileName })
  );
  formData.append(
    "pinataOptions",
    JSON.stringify({ cidVersion: 1 })
  );

  const res = await axios.post(
    "https://api.pinata.cloud/pinning/pinFileToIPFS",
    formData,
    {
      headers: {
        Authorization: `Bearer ${PINATA_JWT}`,
        ...formData.getHeaders(),
      },
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
    }
  );

  return `${PINATA_GATEWAY}/ipfs/${res.data.IpfsHash}`;
}

export async function uploadJsonToPinata(
  data: object,
  name: string
): Promise<string> {
  const res = await axios.post(
    "https://api.pinata.cloud/pinning/pinJSONToIPFS",
    {
      pinataMetadata: { name },
      pinataOptions: { cidVersion: 1 },
      pinataContent: data,
    },
    {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${PINATA_JWT}`,
      },
    }
  );

  return `${PINATA_GATEWAY}/ipfs/${res.data.IpfsHash}`;
}

export async function uploadMetadata(params: UploadMetadataParams): Promise<string> {
  const {
    name,
    symbol,
    logoBuffer,
    logoFileName,
    description,
    website,
    twitter,
    telegram,
  } = params;

  // Upload image first
  const imageUri = await uploadImageToPinata(logoBuffer, logoFileName);

  // Build metadata JSON (PumpFun / Metaplex standard)
  const metadata: Record<string, unknown> = {
    name,
    symbol,
    description: description || `${name} (${symbol})`,
    image: imageUri,
    showName: true,
    createdOn: "https://pump.fun",
    twitter: twitter || undefined,
    telegram: telegram || undefined,
    website: website || undefined,
  };

  // Remove undefined fields
  Object.keys(metadata).forEach(
    (k) => metadata[k] === undefined && delete metadata[k]
  );

  const metadataUri = await uploadJsonToPinata(metadata, `${symbol}_metadata`);
  return metadataUri;
}
