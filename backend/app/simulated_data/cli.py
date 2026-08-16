"""Repository-root CLI for C-07 generate, validate, seed, reset, and export."""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

from backend.app.config import Settings
from backend.app.database import create_database_engine, create_session_factory

from .config import (
    DATASET_VERSION,
    FIXED_EPOCH,
    GENERATOR_VERSION,
    RANDOM_SEED,
    GenerationSettings,
    ProfileName,
    load_profile,
)
from .exporter import export_anonymized
from .generator import generate_dataset
from .persistence import reset_identity, seed_identity
from .validation import validate_dataset


def _repo_root() -> Path:
    return Path(__file__).resolve().parents[3]


def _dataset_dir(root: Path, profile: str) -> Path:
    return root / "data" / ("small" if profile == "small" else f"generated/{profile}")


def _add_profile(parser: argparse.ArgumentParser) -> None:
    parser.add_argument("--profile", required=True, choices=("small", "standard", "stress"))


def _add_stress_overrides(parser: argparse.ArgumentParser) -> None:
    parser.add_argument("--users", type=int)
    parser.add_argument("--training-tasks", type=int)
    parser.add_argument("--learning-records", type=int)


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="tegang-data",
        description="Deterministic C-07 simulated dataset lifecycle commands.",
    )
    subparsers = parser.add_subparsers(dest="command", required=True)
    generate = subparsers.add_parser("generate", help="generate one deterministic profile")
    _add_profile(generate)
    _add_stress_overrides(generate)
    generate.add_argument("--dataset-version", default=DATASET_VERSION)
    generate.add_argument("--generator-version", default=GENERATOR_VERSION)
    generate.add_argument("--random-seed", type=int, default=RANDOM_SEED)
    generate.add_argument("--fixed-epoch", default=FIXED_EPOCH)

    validate = subparsers.add_parser("validate", help="validate contracts, hashes, counts, and references")
    _add_profile(validate)

    seed = subparsers.add_parser("seed", help="seed only identity-compatible objects into the database")
    _add_profile(seed)

    reset = subparsers.add_parser("reset", help="transactionally reset only one exact simulated dataset")
    _add_profile(reset)
    reset.add_argument("--confirm-simulated-data", action="store_true")

    export = subparsers.add_parser("export", help="write a field-whitelist anonymized export")
    _add_profile(export)
    export.add_argument("--anonymized", action="store_true")
    return parser


def _profile_from_args(root: Path, args: argparse.Namespace):
    return load_profile(
        root,
        args.profile,
        users=getattr(args, "users", None),
        training_tasks=getattr(args, "training_tasks", None),
        learning_records=getattr(args, "learning_records", None),
    )


def _database_factory() -> tuple[object, object]:
    settings = Settings.from_env()
    if settings.app_env == "production":
        raise ValueError("C-07 seed/reset is refused when APP_ENV=production")
    engine = create_database_engine(settings)
    factory = create_session_factory(engine)
    if engine is None or factory is None:
        raise ValueError("DATABASE_URL is required for C-07 seed/reset")
    return engine, factory


def run(args: argparse.Namespace) -> int:
    root = _repo_root()
    dataset_dir = _dataset_dir(root, args.profile)
    if args.command == "generate":
        profile = _profile_from_args(root, args)
        settings = GenerationSettings(
            dataset_version=args.dataset_version,
            generator_version=args.generator_version,
            random_seed=args.random_seed,
            fixed_epoch=args.fixed_epoch,
        )
        manifest = generate_dataset(root, profile, settings=settings)
        print(f"[PASS] generated {profile.name}: {manifest}")
        return 0
    if args.command == "validate":
        result = validate_dataset(dataset_dir, output_root=root)
        print(
            f"[PASS] validated {result.profile} dataset {result.dataset_version}: "
            f"files={result.files_checked}, primary_ids={result.primary_ids_checked}"
        )
        return 0
    if args.command == "export":
        if not args.anonymized:
            raise ValueError("export requires --anonymized; raw database export is not supported")
        validate_dataset(dataset_dir, output_root=root)
        manifest = export_anonymized(dataset_dir, repo_root=root)
        print(f"[PASS] anonymized whitelist export: {manifest}")
        return 0

    result = validate_dataset(dataset_dir, output_root=root)
    del result
    if args.command == "reset" and not args.confirm_simulated_data:
        raise ValueError("reset refused: add --confirm-simulated-data for the exact target profile")
    engine, factory = _database_factory()
    try:
        if args.command == "seed":
            with factory.begin() as session:
                seeded = seed_identity(session, dataset_dir, profile_name=args.profile)
            print(
                f"[PASS] seeded {seeded.profile}: positions_created={seeded.positions_created}, "
                f"users_created={seeded.users_created}, profiles_created={seeded.profiles_created}, "
                f"verified={seeded.existing_records_verified}"
            )
            return 0
        with factory.begin() as session:
            reset = reset_identity(session, dataset_dir, profile_name=args.profile)
        print(
            f"[PASS] reset {reset.profile}: users_removed={reset.users_removed}, "
            f"positions_removed={reset.positions_removed}, users_recreated={reset.seed.users_created}"
        )
        return 0
    finally:
        engine.dispose()


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    try:
        return run(args)
    except (ValueError, OSError) as error:
        print(f"[FAIL] {error}", file=sys.stderr)
        return 2
