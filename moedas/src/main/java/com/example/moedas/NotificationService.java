package com.example.moedas;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.mail.MailException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
class NotificationService {
    private final JavaMailSender mailSender;
    private final String from;

    NotificationService(JavaMailSender mailSender, @Value("${merite.mail-from}") String from) {
        this.mailSender = mailSender;
        this.from = from;
    }

    void send(String recipient, String subject, String body) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(from);
        message.setTo(recipient);
        message.setSubject(subject);
        message.setText(body);
        try {
            mailSender.send(message);
        } catch (MailException exception) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                    "Não foi possível enviar o e-mail. A operação foi cancelada.", exception);
        }
    }
}
