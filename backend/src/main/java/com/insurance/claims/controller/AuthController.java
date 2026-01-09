package com.insurance.claims.controller;

import com.insurance.claims.model.User;
import com.insurance.claims.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class AuthController {

    private final UserService userService;

    @GetMapping("/user")
    public ResponseEntity<Map<String, Object>> getAuthenticatedUser(
            @AuthenticationPrincipal OAuth2User principal) {
        if (principal == null) {
            return ResponseEntity.ok(Map.of("authenticated", false));
        }

        String email = principal.getAttribute("email");
        String name = principal.getAttribute("name");
        String picture = principal.getAttribute("picture");
        String googleId = principal.getAttribute("sub");

        User user = userService.findOrCreateUser(email, name, picture, googleId);

        Map<String, Object> response = new HashMap<>();
        response.put("authenticated", true);
        response.put("user", user);
        response.put("isAdmin", userService.isAdmin(user.getId()));

        return ResponseEntity.ok(response);
    }

    @GetMapping("/logout")
    public ResponseEntity<Map<String, String>> logout() {
        return ResponseEntity.ok(Map.of("message", "Logged out successfully"));
    }
}
