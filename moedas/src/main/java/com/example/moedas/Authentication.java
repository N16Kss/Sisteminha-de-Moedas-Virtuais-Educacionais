package com.example.moedas;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

@Component
class SessionAuthenticationFilter extends OncePerRequestFilter {
    private final MeritDao dao;
    private final AuthService authService;

    SessionAuthenticationFilter(MeritDao dao, AuthService authService) {
        this.dao = dao;
        this.authService = authService;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        String header = request.getHeader("Authorization");
        if (header != null && header.startsWith("Bearer ")) {
            String token = header.substring(7).trim();
            dao.findSessionUser(authService.hashToken(token)).flatMap(dao::findAccountById).ifPresent(account -> {
                var principal = new UsernamePasswordAuthenticationToken(account, token,
                        List.of(new SimpleGrantedAuthority("ROLE_" + account.role().toUpperCase())));
                SecurityContextHolder.getContext().setAuthentication(principal);
            });
        }
        chain.doFilter(request, response);
    }
}
