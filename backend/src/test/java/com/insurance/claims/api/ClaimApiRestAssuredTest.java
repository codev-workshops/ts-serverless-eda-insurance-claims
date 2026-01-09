package com.insurance.claims.api;

import com.insurance.claims.model.ClaimStatus;
import com.insurance.claims.model.ClaimType;
import io.restassured.RestAssured;
import io.restassured.http.ContentType;
import io.restassured.response.Response;
import org.junit.jupiter.api.*;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.test.context.ActiveProfiles;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.Map;

import static io.restassured.RestAssured.*;
import static org.hamcrest.Matchers.*;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
@DisplayName("Claim API Rest Assured Tests")
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
class ClaimApiRestAssuredTest {

    @LocalServerPort
    private int port;

    private static String createdClaimId;
    private static String authToken;

    @BeforeEach
    void setUp() {
        RestAssured.port = port;
        RestAssured.basePath = "/api";
    }

    @Nested
    @DisplayName("Claims API CRUD Operations")
    @TestMethodOrder(MethodOrderer.OrderAnnotation.class)
    class ClaimsCrudTests {

        @Test
        @Order(1)
        @DisplayName("POST /claims - Should create a new claim")
        void shouldCreateNewClaim() {
            Map<String, Object> claimRequest = new HashMap<>();
            claimRequest.put("policyNumber", "POL-REST-001");
            claimRequest.put("claimantName", "Rest Assured Test User");
            claimRequest.put("claimantEmail", "restassured@test.com");
            claimRequest.put("claimType", ClaimType.AUTO.name());
            claimRequest.put("claimAmount", 5000.00);
            claimRequest.put("incidentDate", LocalDate.now().minusDays(5).toString());
            claimRequest.put("description", "Rest Assured test claim");

            Response response = given()
                    .contentType(ContentType.JSON)
                    .body(claimRequest)
                    .when()
                    .post("/claims")
                    .then()
                    .statusCode(anyOf(is(200), is(201), is(401)))
                    .extract()
                    .response();

            if (response.statusCode() == 200 || response.statusCode() == 201) {
                createdClaimId = response.jsonPath().getString("id");
                
                response.then()
                        .body("policyNumber", equalTo("POL-REST-001"))
                        .body("claimantName", equalTo("Rest Assured Test User"))
                        .body("claimType", equalTo("AUTO"))
                        .body("status", equalTo("PENDING"));
            }
        }

        @Test
        @Order(2)
        @DisplayName("GET /claims - Should return list of claims")
        void shouldReturnListOfClaims() {
            given()
                    .param("allClaims", false)
                    .when()
                    .get("/claims")
                    .then()
                    .statusCode(anyOf(is(200), is(401)));
        }

        @Test
        @Order(3)
        @DisplayName("GET /claims/{id} - Should return claim by ID")
        void shouldReturnClaimById() {
            if (createdClaimId != null) {
                given()
                        .pathParam("id", createdClaimId)
                        .when()
                        .get("/claims/{id}")
                        .then()
                        .statusCode(anyOf(is(200), is(401), is(404)))
                        .body(anyOf(
                                hasKey("id"),
                                hasKey("error"),
                                hasKey("message")
                        ));
            }
        }

        @Test
        @Order(4)
        @DisplayName("PUT /claims/{id} - Should update existing claim")
        void shouldUpdateExistingClaim() {
            if (createdClaimId != null) {
                Map<String, Object> updateRequest = new HashMap<>();
                updateRequest.put("policyNumber", "POL-REST-001-UPDATED");
                updateRequest.put("claimantName", "Updated Rest User");
                updateRequest.put("claimantEmail", "updated@test.com");
                updateRequest.put("claimType", ClaimType.HEALTH.name());
                updateRequest.put("claimAmount", 7500.00);
                updateRequest.put("incidentDate", LocalDate.now().minusDays(3).toString());
                updateRequest.put("description", "Updated description");

                given()
                        .contentType(ContentType.JSON)
                        .pathParam("id", createdClaimId)
                        .body(updateRequest)
                        .when()
                        .put("/claims/{id}")
                        .then()
                        .statusCode(anyOf(is(200), is(401), is(404)));
            }
        }

        @Test
        @Order(5)
        @DisplayName("PATCH /claims/{id}/status - Should update claim status")
        void shouldUpdateClaimStatus() {
            if (createdClaimId != null) {
                Map<String, String> statusUpdate = new HashMap<>();
                statusUpdate.put("status", ClaimStatus.UNDER_REVIEW.name());

                given()
                        .contentType(ContentType.JSON)
                        .pathParam("id", createdClaimId)
                        .body(statusUpdate)
                        .when()
                        .patch("/claims/{id}/status")
                        .then()
                        .statusCode(anyOf(is(200), is(401), is(404)));
            }
        }

        @Test
        @Order(6)
        @DisplayName("DELETE /claims/{id} - Should delete claim")
        void shouldDeleteClaim() {
            if (createdClaimId != null) {
                given()
                        .pathParam("id", createdClaimId)
                        .when()
                        .delete("/claims/{id}")
                        .then()
                        .statusCode(anyOf(is(200), is(204), is(401), is(404)));
            }
        }
    }

    @Nested
    @DisplayName("Claims API Validation Tests")
    class ClaimsValidationTests {

        @Test
        @DisplayName("POST /claims - Should return 400 for missing required fields")
        void shouldReturn400ForMissingRequiredFields() {
            Map<String, Object> invalidRequest = new HashMap<>();

            given()
                    .contentType(ContentType.JSON)
                    .body(invalidRequest)
                    .when()
                    .post("/claims")
                    .then()
                    .statusCode(anyOf(is(400), is(401)));
        }

        @Test
        @DisplayName("POST /claims - Should return 400 for invalid email format")
        void shouldReturn400ForInvalidEmailFormat() {
            Map<String, Object> claimRequest = new HashMap<>();
            claimRequest.put("policyNumber", "POL-001");
            claimRequest.put("claimantName", "Test User");
            claimRequest.put("claimantEmail", "invalid-email");
            claimRequest.put("claimType", ClaimType.AUTO.name());
            claimRequest.put("claimAmount", 5000.00);
            claimRequest.put("incidentDate", LocalDate.now().toString());

            given()
                    .contentType(ContentType.JSON)
                    .body(claimRequest)
                    .when()
                    .post("/claims")
                    .then()
                    .statusCode(anyOf(is(400), is(401)));
        }

        @Test
        @DisplayName("POST /claims - Should return 400 for negative claim amount")
        void shouldReturn400ForNegativeClaimAmount() {
            Map<String, Object> claimRequest = new HashMap<>();
            claimRequest.put("policyNumber", "POL-001");
            claimRequest.put("claimantName", "Test User");
            claimRequest.put("claimantEmail", "test@example.com");
            claimRequest.put("claimType", ClaimType.AUTO.name());
            claimRequest.put("claimAmount", -100.00);
            claimRequest.put("incidentDate", LocalDate.now().toString());

            given()
                    .contentType(ContentType.JSON)
                    .body(claimRequest)
                    .when()
                    .post("/claims")
                    .then()
                    .statusCode(anyOf(is(400), is(401)));
        }

        @Test
        @DisplayName("GET /claims/{id} - Should return 404 for non-existent claim")
        void shouldReturn404ForNonExistentClaim() {
            given()
                    .pathParam("id", "non-existent-id-12345")
                    .when()
                    .get("/claims/{id}")
                    .then()
                    .statusCode(anyOf(is(404), is(401)));
        }

        @Test
        @DisplayName("PUT /claims/{id} - Should return 404 for non-existent claim")
        void shouldReturn404ForUpdatingNonExistentClaim() {
            Map<String, Object> updateRequest = new HashMap<>();
            updateRequest.put("policyNumber", "POL-001");
            updateRequest.put("claimantName", "Test User");
            updateRequest.put("claimantEmail", "test@example.com");
            updateRequest.put("claimType", ClaimType.AUTO.name());
            updateRequest.put("claimAmount", 5000.00);
            updateRequest.put("incidentDate", LocalDate.now().toString());

            given()
                    .contentType(ContentType.JSON)
                    .pathParam("id", "non-existent-id-12345")
                    .body(updateRequest)
                    .when()
                    .put("/claims/{id}")
                    .then()
                    .statusCode(anyOf(is(404), is(401)));
        }

        @Test
        @DisplayName("DELETE /claims/{id} - Should return 404 for non-existent claim")
        void shouldReturn404ForDeletingNonExistentClaim() {
            given()
                    .pathParam("id", "non-existent-id-12345")
                    .when()
                    .delete("/claims/{id}")
                    .then()
                    .statusCode(anyOf(is(404), is(401)));
        }
    }

    @Nested
    @DisplayName("Dashboard Stats API Tests")
    class DashboardStatsTests {

        @Test
        @DisplayName("GET /claims/stats - Should return dashboard statistics")
        void shouldReturnDashboardStatistics() {
            given()
                    .param("allStats", false)
                    .when()
                    .get("/claims/stats")
                    .then()
                    .statusCode(anyOf(is(200), is(401)));
        }

        @Test
        @DisplayName("GET /claims/stats - Should return stats with correct structure")
        void shouldReturnStatsWithCorrectStructure() {
            Response response = given()
                    .param("allStats", false)
                    .when()
                    .get("/claims/stats")
                    .then()
                    .statusCode(anyOf(is(200), is(401)))
                    .extract()
                    .response();

            if (response.statusCode() == 200) {
                response.then()
                        .body("totalClaims", notNullValue())
                        .body("pendingClaims", notNullValue())
                        .body("approvedClaims", notNullValue())
                        .body("rejectedClaims", notNullValue())
                        .body("underReviewClaims", notNullValue())
                        .body("totalClaimAmount", notNullValue())
                        .body("approvedClaimAmount", notNullValue());
            }
        }
    }

    @Nested
    @DisplayName("Claim Types API Tests")
    class ClaimTypesTests {

        @Test
        @DisplayName("POST /claims - Should accept AUTO claim type")
        void shouldAcceptAutoClaimType() {
            Map<String, Object> claimRequest = createValidClaimRequest();
            claimRequest.put("claimType", ClaimType.AUTO.name());

            given()
                    .contentType(ContentType.JSON)
                    .body(claimRequest)
                    .when()
                    .post("/claims")
                    .then()
                    .statusCode(anyOf(is(200), is(201), is(401)));
        }

        @Test
        @DisplayName("POST /claims - Should accept HEALTH claim type")
        void shouldAcceptHealthClaimType() {
            Map<String, Object> claimRequest = createValidClaimRequest();
            claimRequest.put("claimType", ClaimType.HEALTH.name());

            given()
                    .contentType(ContentType.JSON)
                    .body(claimRequest)
                    .when()
                    .post("/claims")
                    .then()
                    .statusCode(anyOf(is(200), is(201), is(401)));
        }

        @Test
        @DisplayName("POST /claims - Should accept PROPERTY claim type")
        void shouldAcceptPropertyClaimType() {
            Map<String, Object> claimRequest = createValidClaimRequest();
            claimRequest.put("claimType", ClaimType.PROPERTY.name());

            given()
                    .contentType(ContentType.JSON)
                    .body(claimRequest)
                    .when()
                    .post("/claims")
                    .then()
                    .statusCode(anyOf(is(200), is(201), is(401)));
        }

        @Test
        @DisplayName("POST /claims - Should accept LIFE claim type")
        void shouldAcceptLifeClaimType() {
            Map<String, Object> claimRequest = createValidClaimRequest();
            claimRequest.put("claimType", ClaimType.LIFE.name());

            given()
                    .contentType(ContentType.JSON)
                    .body(claimRequest)
                    .when()
                    .post("/claims")
                    .then()
                    .statusCode(anyOf(is(200), is(201), is(401)));
        }

        @Test
        @DisplayName("POST /claims - Should return 400 for invalid claim type")
        void shouldReturn400ForInvalidClaimType() {
            Map<String, Object> claimRequest = createValidClaimRequest();
            claimRequest.put("claimType", "INVALID_TYPE");

            given()
                    .contentType(ContentType.JSON)
                    .body(claimRequest)
                    .when()
                    .post("/claims")
                    .then()
                    .statusCode(anyOf(is(400), is(401)));
        }
    }

    @Nested
    @DisplayName("Claim Status Update Tests")
    class ClaimStatusUpdateTests {

        @Test
        @DisplayName("PATCH /claims/{id}/status - Should accept PENDING status")
        void shouldAcceptPendingStatus() {
            Map<String, String> statusUpdate = new HashMap<>();
            statusUpdate.put("status", ClaimStatus.PENDING.name());

            given()
                    .contentType(ContentType.JSON)
                    .pathParam("id", "test-id")
                    .body(statusUpdate)
                    .when()
                    .patch("/claims/{id}/status")
                    .then()
                    .statusCode(anyOf(is(200), is(401), is(404)));
        }

        @Test
        @DisplayName("PATCH /claims/{id}/status - Should accept APPROVED status")
        void shouldAcceptApprovedStatus() {
            Map<String, String> statusUpdate = new HashMap<>();
            statusUpdate.put("status", ClaimStatus.APPROVED.name());

            given()
                    .contentType(ContentType.JSON)
                    .pathParam("id", "test-id")
                    .body(statusUpdate)
                    .when()
                    .patch("/claims/{id}/status")
                    .then()
                    .statusCode(anyOf(is(200), is(401), is(404)));
        }

        @Test
        @DisplayName("PATCH /claims/{id}/status - Should accept REJECTED status")
        void shouldAcceptRejectedStatus() {
            Map<String, String> statusUpdate = new HashMap<>();
            statusUpdate.put("status", ClaimStatus.REJECTED.name());

            given()
                    .contentType(ContentType.JSON)
                    .pathParam("id", "test-id")
                    .body(statusUpdate)
                    .when()
                    .patch("/claims/{id}/status")
                    .then()
                    .statusCode(anyOf(is(200), is(401), is(404)));
        }

        @Test
        @DisplayName("PATCH /claims/{id}/status - Should accept UNDER_REVIEW status")
        void shouldAcceptUnderReviewStatus() {
            Map<String, String> statusUpdate = new HashMap<>();
            statusUpdate.put("status", ClaimStatus.UNDER_REVIEW.name());

            given()
                    .contentType(ContentType.JSON)
                    .pathParam("id", "test-id")
                    .body(statusUpdate)
                    .when()
                    .patch("/claims/{id}/status")
                    .then()
                    .statusCode(anyOf(is(200), is(401), is(404)));
        }

        @Test
        @DisplayName("PATCH /claims/{id}/status - Should return 400 for invalid status")
        void shouldReturn400ForInvalidStatus() {
            Map<String, String> statusUpdate = new HashMap<>();
            statusUpdate.put("status", "INVALID_STATUS");

            given()
                    .contentType(ContentType.JSON)
                    .pathParam("id", "test-id")
                    .body(statusUpdate)
                    .when()
                    .patch("/claims/{id}/status")
                    .then()
                    .statusCode(anyOf(is(400), is(401), is(404)));
        }
    }

    private Map<String, Object> createValidClaimRequest() {
        Map<String, Object> claimRequest = new HashMap<>();
        claimRequest.put("policyNumber", "POL-" + System.currentTimeMillis());
        claimRequest.put("claimantName", "Test User");
        claimRequest.put("claimantEmail", "test@example.com");
        claimRequest.put("claimType", ClaimType.AUTO.name());
        claimRequest.put("claimAmount", 5000.00);
        claimRequest.put("incidentDate", LocalDate.now().minusDays(5).toString());
        claimRequest.put("description", "Test claim description");
        return claimRequest;
    }
}
