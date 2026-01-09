package com.insurance.claims.service;

import com.insurance.claims.model.User;
import com.insurance.claims.model.UserRole;
import com.insurance.claims.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;

    public User findOrCreateUser(String email, String name, String picture, String googleId) {
        Optional<User> existingUser = userRepository.findByGoogleId(googleId);

        if (existingUser.isPresent()) {
            User user = existingUser.get();
            user.setLastLoginAt(LocalDateTime.now());
            user.setName(name);
            user.setPicture(picture);
            return userRepository.save(user);
        }

        User newUser = User.builder()
                .email(email)
                .name(name)
                .picture(picture)
                .googleId(googleId)
                .role(UserRole.USER)
                .createdAt(LocalDateTime.now())
                .lastLoginAt(LocalDateTime.now())
                .build();

        return userRepository.save(newUser);
    }

    public Optional<User> findByEmail(String email) {
        return userRepository.findByEmail(email);
    }

    public Optional<User> findById(String id) {
        return userRepository.findById(id);
    }

    public List<User> getAllUsers() {
        return userRepository.findAll();
    }

    public User updateUserRole(String userId, UserRole role) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found with id: " + userId));
        user.setRole(role);
        return userRepository.save(user);
    }

    public boolean isAdmin(String userId) {
        return userRepository.findById(userId)
                .map(user -> user.getRole() == UserRole.ADMIN)
                .orElse(false);
    }
}
