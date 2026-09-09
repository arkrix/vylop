# Stage 1: Build the application using Maven and JDK 17
FROM maven:3.9-eclipse-temurin-17 AS build
WORKDIR /app

COPY pom.xml .
COPY src ./src

# Download only necessary compile dependencies and package the JAR
RUN --mount=type=cache,target=/root/.m2 mvn clean package -DskipTests -B

# Stage 2: Run the application using the standard JDK 17 runtime
FROM eclipse-temurin:17-jre
WORKDIR /app

# Create non-root system group and user
RUN useradd --system --user-group spring

# Copy jar with spring user ownership
COPY --from=build --chown=spring:spring /app/target/*.jar app.jar

USER spring:spring

EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]