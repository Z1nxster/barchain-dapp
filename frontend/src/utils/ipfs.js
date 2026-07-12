const PINATA_JWT = import.meta.env.VITE_PINATA_JWT;
const GATEWAY    = "https://gateway.pinata.cloud/ipfs";

/**
 * Upload a JSON metadata object to IPFS via Pinata.
 * Returns the full ipfs:// URI.
 */
export async function uploadMetadata(name, metadata) {
    const res = await fetch("https://api.pinata.cloud/pinning/pinJSONToIPFS", {
        method: "POST",
        headers: {
            "Content-Type":  "application/json",
            "Authorization": `Bearer ${PINATA_JWT}`,
        },
        body: JSON.stringify({
            pinataMetadata: { name },
            pinataContent:  metadata,
        }),
    });
    if (!res.ok) throw new Error("IPFS upload failed");
    const { IpfsHash } = await res.json();
    return `ipfs://${IpfsHash}`;
}

/**
 * Convert an ipfs:// URI to an https:// gateway URL for display.
 */
export function ipfsToHttp(uri) {
    if (!uri || !uri.startsWith("ipfs://")) return uri;
    return `${GATEWAY}/${uri.slice(7)}`;
}