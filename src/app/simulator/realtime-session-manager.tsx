import { RefObject } from "react";

// Function accpets active RTCPeerConnection and adds OAI to RTC.
export async function startRealtimeSession(rtcPeerConnection: RefObject<RTCPeerConnection>) {
    let dataChannel: RTCDataChannel | null = null;

    try {
        const tokenResponse = await fetch("/api/realtime-session");
        const data = await tokenResponse.json();
        const EPHEMERAL_KEY = data.client_secret.value;


        dataChannel = rtcPeerConnection.current.createDataChannel("oai-events");

        const offer = await rtcPeerConnection.current.createOffer();
        await rtcPeerConnection.current.setLocalDescription(offer);

        const baseUrl = "https://api.openai.com/v1/realtime";
        const model = "gpt-4o-realtime-preview-2024-12-17";

        const sdpResponse = await fetch(`${baseUrl}?model=${model}`, {
            method: "POST",
            body: offer.sdp,
            headers: {
                Authorization: `Bearer ${EPHEMERAL_KEY}`,
                "Content-Type": "application/sdp"
            },
        });

        const answer: RTCSessionDescriptionInit = {
            type: 'answer' as const,
            sdp: await sdpResponse.text(),
        };

        await rtcPeerConnection.current.setRemoteDescription(answer);
    } catch (error) {
        console.error("Error starting realtime session:", error);
    } 

    return { dataChannel };
}

export function endRealtimeSession(peerConnection: RTCPeerConnection | null, dataChannel: RTCDataChannel | null) {
    try {
        if (dataChannel) {
            dataChannel.close();
        }

        if (peerConnection) {
            if (peerConnection.signalingState !== 'closed') {
                peerConnection.getSenders().forEach(sender => {
                    peerConnection.removeTrack(sender);
                });
                peerConnection.close();
            }
        }
    } catch (error) {
        console.error("Error ending realtime session:", error);
    }
}