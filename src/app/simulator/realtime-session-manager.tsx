export async function startRealtimeSession(rtcPeerConnection: RTCPeerConnection) {
    let dataChannel: RTCDataChannel | null = null;

    try {
        const tokenResponse = await fetch("/api/realtime-session");
        const data = await tokenResponse.json();
        const EPHEMERAL_KEY = data.client_secret.value;

        const audioEl = document.createElement("audio");
        audioEl.autoplay = true;
        rtcPeerConnection.ontrack = (e) => {
            audioEl.srcObject = e.streams[0];
        };

        // Configure audio input with proper settings for Whisper
        const audioConstraints = {
            audio: {
                channelCount: 1, // Mono
                sampleRate: 24000, // 24kHz
                sampleSize: 16 // 16-bit
            }
        };

        const ms = await navigator.mediaDevices.getUserMedia(audioConstraints);
        rtcPeerConnection.addTrack(ms.getTracks()[0]);

        dataChannel = rtcPeerConnection.createDataChannel("oai-events");
        
        const offer = await rtcPeerConnection.createOffer();
        await rtcPeerConnection.setLocalDescription(offer);

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

        await rtcPeerConnection.setRemoteDescription(answer);
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