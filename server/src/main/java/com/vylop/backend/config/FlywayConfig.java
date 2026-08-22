package com.vylop.backend.config;

import org.flywaydb.core.Flyway;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class FlywayConfig {

    @Value("${spring.datasource.url:jdbc:postgresql://localhost:5432/vylopdb?options=-c%20TimeZone=UTC}")
    private String datasourceUrl;

    @Value("${spring.datasource.username:postgres}")
    private String datasourceUsername;

    @Value("${spring.datasource.password:postgres}")
    private String datasourcePassword;

    @Bean(initMethod = "migrate")
    @ConditionalOnProperty(name = "spring.flyway.enabled", havingValue = "true", matchIfMissing = true)
    public Flyway flyway() {
        return Flyway.configure()
                .dataSource(datasourceUrl, datasourceUsername, datasourcePassword)
                .locations("classpath:db/migration")
                .baselineOnMigrate(true)
                .load();
    }
}