package com.insurance.claims.controller;

import com.insurance.claims.model.User;
import com.insurance.claims.model.UserRole;
import com.insurance.claims.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class UserController {

    private final UserService userService;

    @GetMapping("/me")
    public ResponseEntity<User> getCurrentUser(@AuthenticationPrincipal OAuth2User principal) {
        if (principal == null) {
            return ResponseEntity.notFound().build();
        }
        String email = principal.getAttribute("email");
        return userService.findByEmail(email)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping
    public ResponseEntity<List<User>> getAllUsers() {
        List<User> users = userService.getAllUsers();
        return ResponseEntity.ok(users);
    }

    @PatchMapping("/{userId}/role")
    public ResponseEntity<User> updateUserRole(
            @PathVariable String userId,
            @RequestBody Map<String, String> body) {
        UserRole role = UserRole.valueOf(body.get("role").toUpperCase());
        User user = userService.updateUserRole(userId, role);
        return ResponseEntity.ok(user);
    }
}
