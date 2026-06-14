import { generateShareLink } from "@/data/challengeTypes";
import { openWhatsAppShare } from "@/lib/challengeShareMessage";

export type WhatsAppChallengeShareInput = {
    pin: string;
    shareLine: string;
};

/** Join link + localized share text for WhatsApp group/scheduled challenges. */
export function buildWhatsAppChallengeShare({
    pin,
    shareLine,
}: WhatsAppChallengeShareInput): string {
    const link = generateShareLink(pin);
    return `${link}\n\n${shareLine}`;
}

export function openWhatsAppChallengeShare(text: string): void {
    openWhatsAppShare(text);
}
