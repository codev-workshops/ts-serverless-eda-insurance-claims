package com.insurance.claims.repository;

import com.insurance.claims.model.UIConfig;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UIConfigRepository extends MongoRepository<UIConfig, String> {

    Optional<UIConfig> findByPageId(String pageId);
}
