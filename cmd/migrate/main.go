package main

import (
	"flag"
	"log"

	"recipe-ai/internal/config"

	"github.com/golang-migrate/migrate/v4"
	_ "github.com/golang-migrate/migrate/v4/database/postgres"
	_ "github.com/golang-migrate/migrate/v4/source/file"
)

func main() {
	var direction = flag.String("direction", "up", "Migration direction (up/down)")
	var steps = flag.Int("steps", 0, "Number of migration steps (0 for all)")
	flag.Parse()

	cfg := config.Load()

	m, err := migrate.New(
		"file://migrations",
		cfg.DatabaseURL,
	)
	if err != nil {
		log.Fatal("Failed to create migrate instance:", err)
	}
	defer m.Close()

	switch *direction {
	case "up":
		if *steps > 0 {
			err = m.Steps(*steps)
		} else {
			err = m.Up()
		}
	case "down":
		if *steps > 0 {
			err = m.Steps(-*steps)
		} else {
			err = m.Down()
		}
	default:
		log.Fatal("Invalid direction. Use 'up' or 'down'")
	}

	if err != nil && err != migrate.ErrNoChange {
		log.Fatal("Migration failed:", err)
	}

	if err == migrate.ErrNoChange {
		log.Println("No changes to apply")
	} else {
		log.Printf("Migration %s completed successfully", *direction)
	}
}
