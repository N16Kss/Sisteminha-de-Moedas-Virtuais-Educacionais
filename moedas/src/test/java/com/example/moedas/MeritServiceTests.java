package com.example.moedas;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class MeritServiceTests {
    private MeritDao dao;
    private MeritService service;
    private ApiModels.Account sender;
    private ApiModels.Account receiver;

    @BeforeEach
    void setUp() {
        dao = mock(MeritDao.class);
        service = new MeritService(dao, mock(NotificationService.class));
        sender = account("student-a", "student", 100, "institution-a");
        receiver = account("student-b", "student", 0, "institution-a");
        when(dao.findAccountById(receiver.id())).thenReturn(Optional.of(receiver));
    }

    @Test
    void blocksTransferWithoutSharedTeacher() {
        when(dao.sharedClassroomId(sender.id(), receiver.id())).thenReturn(Optional.empty());

        ResponseStatusException error = assertThrows(ResponseStatusException.class,
                () -> service.createTransfer(sender, new ApiModels.TransferRequest(receiver.id(), 20, "Obrigado")));

        assertEquals(403, error.getStatusCode().value());
        verify(dao, never()).reserveBalance(anyString(), anyInt());
        verify(dao, never()).createTransfer(anyString(), anyString(), anyString(), anyInt(), anyString());
    }

    @Test
    void blocksTransferWhenBalanceIsInsufficient() {
        when(dao.sharedClassroomId(sender.id(), receiver.id())).thenReturn(Optional.of("class-a"));
        when(dao.reserveBalance(sender.id(), 120)).thenReturn(false);

        ResponseStatusException error = assertThrows(ResponseStatusException.class,
                () -> service.createTransfer(sender, new ApiModels.TransferRequest(receiver.id(), 120, "Obrigado")));

        assertEquals(409, error.getStatusCode().value());
        verify(dao, never()).createTransfer(anyString(), anyString(), anyString(), anyInt(), anyString());
    }

    @Test
    void createsPendingTransferOnlyAfterValidatingSharedTeacherAndBalance() {
        when(dao.sharedClassroomId(sender.id(), receiver.id())).thenReturn(Optional.of("class-a"));
        when(dao.reserveBalance(sender.id(), 20)).thenReturn(true);

        service.createTransfer(sender, new ApiModels.TransferRequest(receiver.id(), 20, "Obrigado"));

        verify(dao).createTransfer(sender.id(), receiver.id(), "class-a", 20, "Obrigado");
    }

    @Test
    void preventsTransferToSelf() {
        when(dao.findAccountById(sender.id())).thenReturn(Optional.of(sender));

        ResponseStatusException error = assertThrows(ResponseStatusException.class,
                () -> service.createTransfer(sender, new ApiModels.TransferRequest(sender.id(), 20, "Obrigado")));

        assertEquals(400, error.getStatusCode().value());
        verify(dao, never()).sharedClassroomId(anyString(), anyString());
    }

    private static ApiModels.Account account(String id, String role, int balance, String institutionId) {
        return new ApiModels.Account(id, id, id + "@example.test", "hash", role, institutionId,
                "Instituição", null, null, null, null, null, null, null, null, balance);
    }
}
