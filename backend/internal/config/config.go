package config

import (
	"fmt"
	"os"
	"strconv"
	"strings"
	"time"
)

type Config struct {
	App      AppConfig
	Server   ServerConfig
	Database DatabaseConfig
	Hedera   HederaConfig
	IPFS     IPFSConfig
}

type AppConfig struct {
	Name        string
	Environment string
	LogLevel    string
}

type ServerConfig struct {
	Host            string
	Port            string
	ReadTimeout     time.Duration
	WriteTimeout    time.Duration
	ShutdownTimeout time.Duration
}

type DatabaseConfig struct {
	DSN             string
	MaxConns        int32
	MinConns        int32
	MaxConnLifetime time.Duration
}

type HederaConfig struct {
	Network        string
	MirrorNodeURL  string
	JSONRPCURL     string
	FactoryAddress string
	StartTimeStamp string
}

type IPFSConfig struct {
	APIURL     string
	GatewayURL string
}

func Load() (Config, error) {
	cfg := Config{
		App: AppConfig{
			Name:        getEnv("APP_NAME", "verficatory/backend"),
			Environment: getEnv("APP_ENV", "development"),
			LogLevel:    getEnv("LOG_LEVEL", "info"),
		},
		Server: ServerConfig{
			Host:            getEnv("SERVER_HOST", "0.0.0.0"),
			Port:            getEnv("SERVER_PORT", "8080"),
			ReadTimeout:     10 * time.Second,
			WriteTimeout:    15 * time.Second,
			ShutdownTimeout: 15 * time.Second,
		},
		Database: DatabaseConfig{
			DSN:             os.Getenv("DATABASE_URL"),
			MaxConns:        20,
			MinConns:        2,
			MaxConnLifetime: 30 * time.Minute,
		},
		Hedera: HederaConfig{
			Network:        getEnv("HEDERA_NETWORK", "testnet"),
			MirrorNodeURL:  getEnv("HEDERA_MIRROR_NODE_URL", ""),
			JSONRPCURL:     getEnv("HEDERA_JSON_RPC_URL", ""),
			FactoryAddress: getEnv("HEDERA_FACTORY_ADDRESS", ""),
			StartTimeStamp: getEnv("HEDERA_INDEXER_START_TIMESTAMP", ""),
		},
		IPFS: IPFSConfig{
			APIURL:     getEnv("IPFS_API_URL", "http://localhost:5001"),
			GatewayURL: getEnv("IPFS_GATEWAY_URL", "http://localhost:8080"),
		},
	}

	if cfg.Database.DSN == "" {
		return Config{}, fmt.Errorf("DATABASE_URL is required")
	}

	if _, err := strconv.Atoi(cfg.Server.Port); err != nil {
		return Config{}, fmt.Errorf("invalid SERVER_PORT: %w", err)
	}

	cfg.App.Environment = strings.ToLower(cfg.App.Environment)

	return cfg, nil
}

func getEnv(key, fallback string) string {
	value := strings.TrimSpace(os.Getenv(key))
	if value == "" {
		return fallback
	}
	return value
}
