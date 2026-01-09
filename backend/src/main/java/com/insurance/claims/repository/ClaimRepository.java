package com.insurance.claims.repository;

import com.insurance.claims.model.Claim;
import com.insurance.claims.model.ClaimStatus;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ClaimRepository extends MongoRepository<Claim, String> {

    List<Claim> findByUserId(String userId);

    List<Claim> findByStatus(ClaimStatus status);

    List<Claim> findByUserIdAndStatus(String userId, ClaimStatus status);

    List<Claim> findByPolicyNumber(String policyNumber);

    long countByStatus(ClaimStatus status);

    long countByUserId(String userId);
}
