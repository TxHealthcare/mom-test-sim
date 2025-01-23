import { useState } from "react";

export async function startRealtimeSession(audioStream: MediaStream) {
    let peerConnection: RTCPeerConnection | null = null;
    let dataChannel: RTCDataChannel | null = null;

    try {
        const tokenResponse = await fetch("/api/realtime-session");
        const data = await tokenResponse.json();
        const EPHEMERAL_KEY = data.client_secret.value;

        peerConnection = new RTCPeerConnection();

        const audioEl = document.createElement("audio");
        audioEl.autoplay = true;
        peerConnection.ontrack = (e) => {
            audioEl.srcObject = e.streams[0];
        };

        peerConnection.addTrack(audioStream.getTracks()[0]);

        dataChannel = peerConnection.createDataChannel("oai-events");

        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);

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

        await peerConnection.setRemoteDescription(answer);
    } catch (error) {
        console.error("Error starting realtime session:", error);
    } 

    return { peerConnection, dataChannel };
}

export function endRealtimeSession(peerConnection: RTCPeerConnection | null, dataChannel: RTCDataChannel | null) {
    try {
        if (dataChannel) {
            dataChannel.close();
        }

        if (peerConnection) {
            peerConnection.getSenders().forEach(sender => {
                peerConnection.removeTrack(sender);
            });
            peerConnection.close();
        }
    } catch (error) {
        console.error("Error ending realtime session:", error);
    }
}