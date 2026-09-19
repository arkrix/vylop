package com.vylop.backend.security;

import com.vylop.backend.model.ParticipantRole;
import com.vylop.backend.service.RoomService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.MessageBuilder;
import org.springframework.security.access.AccessDeniedException;

import java.security.Principal;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class WebSocketRoleAuthorizationInterceptorTest {

    @Mock
    private RoomService roomService;

    @Mock
    private MessageChannel messageChannel;

    private WebSocketRoleAuthorizationInterceptor interceptor;

    @BeforeEach
    void setUp() {
        interceptor = new WebSocketRoleAuthorizationInterceptor(roomService);
    }

    private Message<?> createMessage(StompCommand command, String destination, String username) {
        StompHeaderAccessor accessor = StompHeaderAccessor.create(command);
        accessor.setDestination(destination);
        if (username != null) {
            Principal principal = mock(Principal.class);
            lenient().when(principal.getName()).thenReturn(username);
            accessor.setUser(principal);
        }
        return MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());
    }

    @Test
    void preSend_readOnlyUser_throwsAccessDenied_onCodeDestination() {
        when(roomService.getRole("room123", "alice")).thenReturn(Optional.of(ParticipantRole.READ_ONLY));
        Message<?> msg = createMessage(StompCommand.SEND, "/app/code/room123", "alice");

        assertThatThrownBy(() -> interceptor.preSend(msg, messageChannel))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining("READ_ONLY participants cannot mutate room code");
    }

    @Test
    void preSend_readOnlyUser_throwsAccessDenied_onYjsDestination() {
        when(roomService.getRole("room123", "alice")).thenReturn(Optional.of(ParticipantRole.READ_ONLY));
        Message<?> msg = createMessage(StompCommand.SEND, "/app/yjs/room123", "alice");

        assertThatThrownBy(() -> interceptor.preSend(msg, messageChannel))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining("READ_ONLY participants cannot mutate room code");
    }

    @Test
    void preSend_editorUser_allowed_onCodeDestination() {
        when(roomService.getRole("room123", "bob")).thenReturn(Optional.of(ParticipantRole.EDITOR));
        Message<?> msg = createMessage(StompCommand.SEND, "/app/code/room123", "bob");

        Message<?> result = interceptor.preSend(msg, messageChannel);
        assertThat(result).isNotNull();
    }

    @Test
    void preSend_editorUser_throwsAccessDenied_onAdminKick() {
        when(roomService.getRole("room123", "bob")).thenReturn(Optional.of(ParticipantRole.EDITOR));
        Message<?> msg = createMessage(StompCommand.SEND, "/app/room/room123/kick", "bob");

        assertThatThrownBy(() -> interceptor.preSend(msg, messageChannel))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining("Only the room HOST can perform administrative actions");
    }

    @Test
    void preSend_editorUser_throwsAccessDenied_onAdminRoleChange() {
        when(roomService.getRole("room123", "bob")).thenReturn(Optional.of(ParticipantRole.EDITOR));
        Message<?> msg = createMessage(StompCommand.SEND, "/app/room/room123/roleChange", "bob");

        assertThatThrownBy(() -> interceptor.preSend(msg, messageChannel))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining("Only the room HOST can perform administrative actions");
    }

    @Test
    void preSend_hostUser_allowed_onAdminActions() {
        when(roomService.getRole("room123", "charlie")).thenReturn(Optional.of(ParticipantRole.HOST));
        Message<?> kickMsg = createMessage(StompCommand.SEND, "/app/room/room123/kick", "charlie");
        Message<?> roleMsg = createMessage(StompCommand.SEND, "/app/room/room123/roleChange", "charlie");

        assertThat(interceptor.preSend(kickMsg, messageChannel)).isNotNull();
        assertThat(interceptor.preSend(roleMsg, messageChannel)).isNotNull();
    }

    @Test
    void preSend_nonSendStompCommands_bypassValidation() {
        Message<?> connectMsg = createMessage(StompCommand.CONNECT, "/app/code/room123", "alice");
        Message<?> result = interceptor.preSend(connectMsg, messageChannel);
        assertThat(result).isNotNull();
    }
}