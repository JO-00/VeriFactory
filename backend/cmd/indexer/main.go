package main

import (
	"context"
	"log"
	"os"
	"os/signal"
	"sync"
	"syscall"
	"time"

	"github.com/joho/godotenv"

	"veriFactory/backend/internal/config"
	"veriFactory/backend/internal/database"
	"veriFactory/backend/internal/modules/indexer"
)

func main() {
	_ = godotenv.Load()

	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("configuration error: %v", err)
	}

	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	startupCtx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()

	pool, err := database.NewPostgresPool(startupCtx, cfg.Database)
	if err != nil {
		log.Fatalf("database initialization failed: %v", err)
	}
	defer pool.Close()

	var wg sync.WaitGroup

	if gwTopic := os.Getenv("HCS_GATEWAY_TOPIC_ID"); gwTopic != "" {
		gwPoller, err := indexer.NewHCSTopicPoller(pool, cfg.Hedera.MirrorNodeURL, gwTopic, indexer.TopicGatewayDocuments, 3*time.Second)
		if err != nil {
			log.Fatalf("gateway HCS poller init failed: %v", err)
		}
		wg.Add(1)
		go func() {
			defer wg.Done()
			gwPoller.Run(ctx)
		}()
	}

	if inspTopic := os.Getenv("HCS_INSPECTOR_TOPIC_ID"); inspTopic != "" {
		inspPoller, err := indexer.NewHCSTopicPoller(pool, cfg.Hedera.MirrorNodeURL, inspTopic, indexer.TopicInspectorReports, 3*time.Second)
		if err != nil {
			log.Fatalf("inspector HCS poller init failed: %v", err)
		}
		wg.Add(1)
		go func() {
			defer wg.Done()
			inspPoller.Run(ctx)
		}()
	}

	log.Println("HCS topic indexer running")
	<-ctx.Done()
	wg.Wait()
	log.Println("HCS topic indexer stopped")
}
