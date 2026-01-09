package com.insurance.claims.service;

import com.insurance.claims.model.User;
import com.insurance.claims.model.UserRole;
import com.insurance.claims.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("UserService Unit Tests")
class UserServiceTest {

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private UserService userService;

    private User testUser;
    private String testEmail;
    private String testName;
    private String testPicture;
    private String testGoogleId;

    @BeforeEach
    void setUp() {
        testEmail = "john.doe@example.com";
        testName = "John Doe";
        testPicture = "https://example.com/picture.jpg";
        testGoogleId = "google123";

        testUser = User.builder()
                .id("user123")
                .email(testEmail)
                .name(testName)
                .picture(testPicture)
                .googleId(testGoogleId)
                .role(UserRole.USER)
                .createdAt(LocalDateTime.now().minusDays(30))
                .lastLoginAt(LocalDateTime.now().minusDays(1))
                .build();
    }

    @Nested
    @DisplayName("Find Or Create User Tests")
    class FindOrCreateUserTests {

        @Test
        @DisplayName("Should return existing user and update last login")
        void shouldReturnExistingUserAndUpdateLastLogin() {
            when(userRepository.findByGoogleId(testGoogleId)).thenReturn(Optional.of(testUser));
            when(userRepository.save(any(User.class))).thenReturn(testUser);

            User result = userService.findOrCreateUser(testEmail, testName, testPicture, testGoogleId);

            assertNotNull(result);
            assertEquals(testEmail, result.getEmail());
            verify(userRepository, times(1)).findByGoogleId(testGoogleId);
            verify(userRepository, times(1)).save(any(User.class));
        }

        @Test
        @DisplayName("Should create new user when not found")
        void shouldCreateNewUserWhenNotFound() {
            User newUser = User.builder()
                    .id("newUser123")
                    .email(testEmail)
                    .name(testName)
                    .picture(testPicture)
                    .googleId(testGoogleId)
                    .role(UserRole.USER)
                    .createdAt(LocalDateTime.now())
                    .lastLoginAt(LocalDateTime.now())
                    .build();

            when(userRepository.findByGoogleId(testGoogleId)).thenReturn(Optional.empty());
            when(userRepository.save(any(User.class))).thenReturn(newUser);

            User result = userService.findOrCreateUser(testEmail, testName, testPicture, testGoogleId);

            assertNotNull(result);
            assertEquals(testEmail, result.getEmail());
            assertEquals(UserRole.USER, result.getRole());
            verify(userRepository, times(1)).save(any(User.class));
        }

        @Test
        @DisplayName("Should set default role as USER for new users")
        void shouldSetDefaultRoleAsUserForNewUsers() {
            when(userRepository.findByGoogleId(testGoogleId)).thenReturn(Optional.empty());
            when(userRepository.save(any(User.class))).thenAnswer(invocation -> {
                User user = invocation.getArgument(0);
                assertEquals(UserRole.USER, user.getRole());
                return user;
            });

            userService.findOrCreateUser(testEmail, testName, testPicture, testGoogleId);

            verify(userRepository, times(1)).save(any(User.class));
        }

        @Test
        @DisplayName("Should update name and picture for existing user")
        void shouldUpdateNameAndPictureForExistingUser() {
            String newName = "John Updated";
            String newPicture = "https://example.com/new-picture.jpg";

            when(userRepository.findByGoogleId(testGoogleId)).thenReturn(Optional.of(testUser));
            when(userRepository.save(any(User.class))).thenAnswer(invocation -> {
                User user = invocation.getArgument(0);
                assertEquals(newName, user.getName());
                assertEquals(newPicture, user.getPicture());
                return user;
            });

            userService.findOrCreateUser(testEmail, newName, newPicture, testGoogleId);

            verify(userRepository, times(1)).save(any(User.class));
        }

        @Test
        @DisplayName("Should set createdAt for new user")
        void shouldSetCreatedAtForNewUser() {
            when(userRepository.findByGoogleId(testGoogleId)).thenReturn(Optional.empty());
            when(userRepository.save(any(User.class))).thenAnswer(invocation -> {
                User user = invocation.getArgument(0);
                assertNotNull(user.getCreatedAt());
                return user;
            });

            userService.findOrCreateUser(testEmail, testName, testPicture, testGoogleId);

            verify(userRepository, times(1)).save(any(User.class));
        }

        @Test
        @DisplayName("Should set lastLoginAt for new user")
        void shouldSetLastLoginAtForNewUser() {
            when(userRepository.findByGoogleId(testGoogleId)).thenReturn(Optional.empty());
            when(userRepository.save(any(User.class))).thenAnswer(invocation -> {
                User user = invocation.getArgument(0);
                assertNotNull(user.getLastLoginAt());
                return user;
            });

            userService.findOrCreateUser(testEmail, testName, testPicture, testGoogleId);

            verify(userRepository, times(1)).save(any(User.class));
        }
    }

    @Nested
    @DisplayName("Find By Email Tests")
    class FindByEmailTests {

        @Test
        @DisplayName("Should return user when found by email")
        void shouldReturnUserWhenFoundByEmail() {
            when(userRepository.findByEmail(testEmail)).thenReturn(Optional.of(testUser));

            Optional<User> result = userService.findByEmail(testEmail);

            assertTrue(result.isPresent());
            assertEquals(testEmail, result.get().getEmail());
        }

        @Test
        @DisplayName("Should return empty when user not found by email")
        void shouldReturnEmptyWhenUserNotFoundByEmail() {
            when(userRepository.findByEmail("nonexistent@example.com")).thenReturn(Optional.empty());

            Optional<User> result = userService.findByEmail("nonexistent@example.com");

            assertTrue(result.isEmpty());
        }
    }

    @Nested
    @DisplayName("Find By ID Tests")
    class FindByIdTests {

        @Test
        @DisplayName("Should return user when found by ID")
        void shouldReturnUserWhenFoundById() {
            when(userRepository.findById("user123")).thenReturn(Optional.of(testUser));

            Optional<User> result = userService.findById("user123");

            assertTrue(result.isPresent());
            assertEquals("user123", result.get().getId());
        }

        @Test
        @DisplayName("Should return empty when user not found by ID")
        void shouldReturnEmptyWhenUserNotFoundById() {
            when(userRepository.findById("nonexistent")).thenReturn(Optional.empty());

            Optional<User> result = userService.findById("nonexistent");

            assertTrue(result.isEmpty());
        }
    }

    @Nested
    @DisplayName("Get All Users Tests")
    class GetAllUsersTests {

        @Test
        @DisplayName("Should return all users")
        void shouldReturnAllUsers() {
            User user2 = User.builder()
                    .id("user456")
                    .email("jane.doe@example.com")
                    .name("Jane Doe")
                    .role(UserRole.ADMIN)
                    .build();

            when(userRepository.findAll()).thenReturn(Arrays.asList(testUser, user2));

            List<User> users = userService.getAllUsers();

            assertEquals(2, users.size());
            verify(userRepository, times(1)).findAll();
        }

        @Test
        @DisplayName("Should return empty list when no users exist")
        void shouldReturnEmptyListWhenNoUsersExist() {
            when(userRepository.findAll()).thenReturn(Collections.emptyList());

            List<User> users = userService.getAllUsers();

            assertTrue(users.isEmpty());
        }
    }

    @Nested
    @DisplayName("Update User Role Tests")
    class UpdateUserRoleTests {

        @Test
        @DisplayName("Should update user role to ADMIN")
        void shouldUpdateUserRoleToAdmin() {
            User updatedUser = User.builder()
                    .id("user123")
                    .email(testEmail)
                    .role(UserRole.ADMIN)
                    .build();

            when(userRepository.findById("user123")).thenReturn(Optional.of(testUser));
            when(userRepository.save(any(User.class))).thenReturn(updatedUser);

            User result = userService.updateUserRole("user123", UserRole.ADMIN);

            assertEquals(UserRole.ADMIN, result.getRole());
            verify(userRepository, times(1)).save(any(User.class));
        }

        @Test
        @DisplayName("Should update user role to USER")
        void shouldUpdateUserRoleToUser() {
            testUser.setRole(UserRole.ADMIN);
            User updatedUser = User.builder()
                    .id("user123")
                    .email(testEmail)
                    .role(UserRole.USER)
                    .build();

            when(userRepository.findById("user123")).thenReturn(Optional.of(testUser));
            when(userRepository.save(any(User.class))).thenReturn(updatedUser);

            User result = userService.updateUserRole("user123", UserRole.USER);

            assertEquals(UserRole.USER, result.getRole());
        }

        @Test
        @DisplayName("Should throw exception when updating role of non-existent user")
        void shouldThrowExceptionWhenUpdatingRoleOfNonExistentUser() {
            when(userRepository.findById("nonexistent")).thenReturn(Optional.empty());

            assertThrows(RuntimeException.class,
                    () -> userService.updateUserRole("nonexistent", UserRole.ADMIN));

            verify(userRepository, never()).save(any(User.class));
        }
    }

    @Nested
    @DisplayName("Is Admin Tests")
    class IsAdminTests {

        @Test
        @DisplayName("Should return true for admin user")
        void shouldReturnTrueForAdminUser() {
            testUser.setRole(UserRole.ADMIN);
            when(userRepository.findById("user123")).thenReturn(Optional.of(testUser));

            boolean result = userService.isAdmin("user123");

            assertTrue(result);
        }

        @Test
        @DisplayName("Should return false for regular user")
        void shouldReturnFalseForRegularUser() {
            testUser.setRole(UserRole.USER);
            when(userRepository.findById("user123")).thenReturn(Optional.of(testUser));

            boolean result = userService.isAdmin("user123");

            assertFalse(result);
        }

        @Test
        @DisplayName("Should return false for non-existent user")
        void shouldReturnFalseForNonExistentUser() {
            when(userRepository.findById("nonexistent")).thenReturn(Optional.empty());

            boolean result = userService.isAdmin("nonexistent");

            assertFalse(result);
        }
    }
}
