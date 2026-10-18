package com.telemedicine.videoconsultation.signaling;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Relays WebRTC offer/answer/ICE and shared chat between the two peers in a
 * room. The room id is the appointment reference, so the patient app and the
 * physician app join the same room and connect to each other.
 */
@Component
public class SignalHandler extends TextWebSocketHandler {

    private final ObjectMapper mapper = new ObjectMapper();
    private final Map<String, Set<WebSocketSession>> rooms = new ConcurrentHashMap<>();
    private final Map<String, String> sessionRooms = new ConcurrentHashMap<>();

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) throws Exception {
        JsonNode node = mapper.readTree(message.getPayload());
        String type = node.path("type").asText("");
        String room = node.path("roomId").asText("");
        if (room.isBlank()) return;

        if ("join".equals(type)) {
            sessionRooms.put(session.getId(), room);
            rooms.computeIfAbsent(room, key -> ConcurrentHashMap.newKeySet()).add(session);
            broadcast(room, session, new TextMessage(
                    mapper.writeValueAsString(Map.of("type", "peer-joined", "roomId", room))));
            return;
        }
        if (!room.equals(sessionRooms.get(session.getId()))) return;
        broadcast(room, session, message);
    }

    private void broadcast(String room, WebSocketSession sender, TextMessage message) throws Exception {
        for (WebSocketSession peer : rooms.getOrDefault(room, Set.of())) {
            if (peer.isOpen() && !peer.getId().equals(sender.getId())) {
                synchronized (peer) { peer.sendMessage(message); }
            }
        }
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
        String room = sessionRooms.remove(session.getId());
        if (room != null) {
            Set<WebSocketSession> peers = rooms.get(room);
            if (peers != null) {
                peers.remove(session);
                if (peers.isEmpty()) rooms.remove(room);
            }
        }
    }
}