package com.vylop.backend.service;

import com.vylop.backend.model.Room;
import com.vylop.backend.model.RoomFile;
import com.vylop.backend.model.User;
import com.vylop.backend.repository.RoomFileRepository;
import com.vylop.backend.repository.RoomRepository;
import com.vylop.backend.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class WorkspaceServiceTest {

    @Mock
    private RoomRepository roomRepository;

    @Mock
    private RoomFileRepository roomFileRepository;

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private WorkspaceService workspaceService;

    private UUID roomId;
    private User user;
    private Room room;

    @BeforeEach
    void setUp() {
        roomId = UUID.randomUUID();
        user = new User();
        user.setUsername("shardool");

        room = new Room("My Room", user, false);
        room.setId(roomId);
    }

    @Test
    void registerRoom_returnsError_whenUserNotFound() {
        when(userRepository.findByUsername("ghost")).thenReturn(Optional.empty());

        String result = workspaceService.registerRoom(roomId, "ghost", "Some Room");

        assertThat(result).isEqualTo("Error: User not found!");
        verify(roomRepository, never()).save(any());
    }

    @Test
    void registerRoom_createsRoom_whenNotAlreadyExisting() {
        when(userRepository.findByUsername("shardool")).thenReturn(Optional.of(user));
        when(roomRepository.existsById(roomId)).thenReturn(false);

        String result = workspaceService.registerRoom(roomId, "shardool", "New Room");

        assertThat(result).isEqualTo("Room registered!");
        verify(roomRepository, times(1)).save(any(Room.class));
    }

    @Test
    void registerRoom_doesNotOverwrite_whenRoomAlreadyExists() {
        when(userRepository.findByUsername("shardool")).thenReturn(Optional.of(user));
        when(roomRepository.existsById(roomId)).thenReturn(true);

        String result = workspaceService.registerRoom(roomId, "shardool", "Ignored Name");

        assertThat(result).isEqualTo("Room registered!");
        verify(roomRepository, never()).save(any());
    }

    @Test
    void saveWorkspace_deletesOrphanedFiles_notPresentInIncomingPayload() {
        RoomFile staleFile = new RoomFile(room, "old.py", "print('bye')", "python");
        RoomFile keptFile = new RoomFile(room, "main.py", "print('hi')", "python");

        when(userRepository.findByUsername("shardool")).thenReturn(Optional.of(user));
        when(roomRepository.findById(roomId)).thenReturn(Optional.of(room));
        when(roomFileRepository.findByRoomId(roomId)).thenReturn(List.of(staleFile, keptFile));
        when(roomFileRepository.findByRoomIdAndFileName(roomId, "main.py")).thenReturn(Optional.of(keptFile));

        Map<String, String> incomingFiles = Map.of("main.py", "print('hi')");

        workspaceService.saveWorkspace(roomId, "shardool", "My Room", incomingFiles);

        verify(roomFileRepository, times(1)).delete(staleFile);
        verify(roomFileRepository, never()).delete(keptFile);
    }

    @Test
    void saveWorkspace_updatesExistingFile_ratherThanCreatingDuplicate() {
        RoomFile existing = new RoomFile(room, "main.py", "old content", "python");

        when(userRepository.findByUsername("shardool")).thenReturn(Optional.of(user));
        when(roomRepository.findById(roomId)).thenReturn(Optional.of(room));
        when(roomFileRepository.findByRoomId(roomId)).thenReturn(List.of(existing));
        when(roomFileRepository.findByRoomIdAndFileName(roomId, "main.py")).thenReturn(Optional.of(existing));

        workspaceService.saveWorkspace(roomId, "shardool", "My Room", Map.of("main.py", "new content"));

        assertThat(existing.getContent()).isEqualTo("new content");
        verify(roomFileRepository, times(1)).save(existing);
    }

    @Test
    void deleteWorkspace_rejectsNonHostUser() {
        when(roomRepository.findById(roomId)).thenReturn(Optional.of(room));

        String result = workspaceService.deleteWorkspace(roomId, "someone-else");

        assertThat(result).isEqualTo("Error: Unauthorized. Only the host can delete this workspace.");
        verify(roomRepository, never()).delete(any());
    }

    @Test
    void deleteWorkspace_succeeds_whenRequesterIsHost() {
        when(roomRepository.findById(roomId)).thenReturn(Optional.of(room));
        when(roomFileRepository.findByRoomId(roomId)).thenReturn(List.of());

        String result = workspaceService.deleteWorkspace(roomId, "shardool");

        assertThat(result).isEqualTo("Workspace deleted successfully.");
        verify(roomRepository, times(1)).delete(room);
    }
}