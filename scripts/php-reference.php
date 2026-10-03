<?php

// SPDX-FileCopyrightText: 2026 The Gatepost authors
// SPDX-License-Identifier: Apache-2.0

declare(strict_types=1);

// Writes the API reference of the PHP package as Markdown pages, from its doc comments. It reads
// each public class, enum and interface by reflection, outside the Internal namespaces and
// without @internal, as the API dump of the PHP repo does. Usage:
// php scripts/php-reference.php <package folder> <output folder>

namespace Gatepost\Docs;

use ReflectionClass;
use ReflectionClassConstant;
use ReflectionEnum;
use ReflectionEnumBackedCase;
use ReflectionMethod;
use ReflectionNamedType;
use ReflectionParameter;
use ReflectionProperty;
use ReflectionType;
use RuntimeException;

const PREFIX = 'Gatepost\\Postcode\\';

/**
 * @return array{string, list<array{string, string}>} The description, and each tag with its text.
 */
function readDocComment(string|false $comment): array
{
    if ($comment === false) {
        return ['', []];
    }
    $lines = \explode("\n", \trim(\substr($comment, 3, -2)));
    $lines = \array_map(static fn(string $line): string => \preg_replace('/^\s*\* ?/', '', $line)
        ?? $line, $lines);
    $description = [];
    $tags = [];
    foreach ($lines as $line) {
        if (\preg_match('/^@(\w+)\s*(.*)$/', $line, $tag) === 1) {
            $tags[] = [$tag[1], $tag[2]];
        } elseif ($tags !== []) {
            $last = \array_key_last($tags);
            $tags[$last][1] .= ' ' . \trim($line);
        } else {
            $description[] = $line;
        }
    }

    return [\trim(\implode("\n", $description)), $tags];
}

function isInternal(string|false $comment): bool
{
    return $comment !== false && \str_contains($comment, '@internal');
}

function typeName(?ReflectionType $type): string
{
    $name = (string) $type;

    return \str_replace(PREFIX, '', $name);
}

function isInternalType(?ReflectionType $type): bool
{
    return $type instanceof ReflectionNamedType && \str_contains($type->getName(), '\\Internal\\');
}

// A default value or a constant as PHP code. The package uses scalars and null only.
function literal(mixed $value): string
{
    return match (true) {
        $value === null => 'null',
        \is_bool($value) => $value ? 'true' : 'false',
        \is_int($value), \is_float($value) => (string) $value,
        \is_string($value) => "'" . \addcslashes($value, "'\\") . "'",
        default => throw new RuntimeException('A default value is not a scalar.'),
    };
}

function parameterText(ReflectionParameter $parameter): string
{
    $text = \trim(typeName($parameter->getType()) . ' $' . $parameter->getName());

    return $parameter->isDefaultValueAvailable()
        ? $text . ' = ' . literal($parameter->getDefaultValue())
        : $text;
}

/**
 * @return list<ReflectionParameter> The parameters that callers use. A parameter of an internal
 *                                   type is a seam for the tests of the package.
 */
function publicParameters(ReflectionMethod $method): array
{
    return \array_values(\array_filter(
        $method->getParameters(),
        static fn(ReflectionParameter $parameter): bool => !isInternalType($parameter->getType()),
    ));
}

/**
 * @return list<string>
 */
function methodLines(ReflectionMethod $method): array
{
    [$description, $tags] = readDocComment($method->getDocComment());
    $parameters = \array_map(parameterText(...), publicParameters($method));
    $static = $method->isStatic() ? 'static ' : '';
    $return = $method->hasReturnType() ? ': ' . typeName($method->getReturnType()) : '';
    $head = "public {$static}function {$method->getName()}(";
    $signature = $head . \implode(', ', $parameters) . "){$return}";
    // A long signature puts each parameter on its own line, as the PER coding style does.
    if (\strlen($signature) > 100) {
        $signature = $head . "\n    " . \implode(",\n    ", $parameters) . ",\n){$return}";
    }
    $lines = ["### {$method->getName()}()", '', '```php', $signature, '```', ''];
    if ($description !== '') {
        $lines = [...$lines, $description, ''];
    }

    return [...$lines, ...tagLines($tags, publicParameters($method))];
}

/**
 * @param list<array{string, string}> $tags
 * @param list<ReflectionParameter>   $parameters
 *
 * @return list<string>
 */
function tagLines(array $tags, array $parameters): array
{
    $names = \array_map(static fn(ReflectionParameter $p): string => $p->getName(), $parameters);
    $rows = [];
    $throws = [];
    foreach ($tags as [$tag, $text]) {
        $text = \trim((string) \preg_replace('/\s+/', ' ', $text));
        if ($tag === 'param' && \preg_match('/^\S+\s+\$(\w+)\s*(.*)$/', $text, $param) === 1) {
            if (\in_array($param[1], $names, true)) {
                $rows[] = "| `\${$param[1]}` | {$param[2]} |";
            }
        } elseif ($tag === 'throws') {
            $throws[] = "- {$text}";
        }
    }
    $lines = $rows === [] ? [] : ['#### Parameters', '', '| Name | Meaning |', '| --- | --- |'];
    $lines = $rows === [] ? [] : [...$lines, ...$rows, ''];

    return $throws === [] ? $lines : [...$lines, '#### Throws', '', ...$throws, ''];
}

/**
 * @return list<string>
 */
function memberLines(ReflectionClassConstant|ReflectionProperty $member, string $code): array
{
    [$description] = readDocComment($member->getDocComment());
    $meaning = $description === '' ? '' : ': ' . \str_replace("\n", ' ', $description);

    return ["- `{$code}`{$meaning}"];
}

/**
 * @param ReflectionClass<object> $class
 *
 * @return list<string>
 */
function classLines(ReflectionClass $class): array
{
    [$description] = readDocComment($class->getDocComment());
    $short = $class->getShortName();
    $first = \preg_split('/(?<=\.)\s/', \str_replace("\n", ' ', $description))[0] ?? '';
    $lines = [
        '---',
        "title: {$short}",
        'description: ' . \json_encode($first, \JSON_UNESCAPED_SLASHES | \JSON_UNESCAPED_UNICODE),
        'editUrl: false',
        '---',
        '',
        "`{$class->getName()}`",
        '',
        $description,
        '',
    ];
    $members = [];
    if ($class instanceof ReflectionEnum) {
        foreach ($class->getCases() as $case) {
            $value = $case instanceof ReflectionEnumBackedCase
                ? ' = ' . literal($case->getBackingValue())
                : '';
            $members = [...$members, ...memberLines($case, $case->getName() . $value)];
        }
    }
    foreach ($class->getReflectionConstants(ReflectionClassConstant::IS_PUBLIC) as $constant) {
        if (!$constant->isEnumCase()) {
            $code = $constant->getName() . ' = ' . literal($constant->getValue());
            $members = [...$members, ...memberLines($constant, $code)];
        }
    }
    // An enum has the properties name and value, which the cases already show.
    $properties = $class->isEnum() ? [] : $class->getProperties(ReflectionProperty::IS_PUBLIC);
    foreach ($properties as $property) {
        $code = typeName($property->getType()) . ' $' . $property->getName();
        $members = [...$members, ...memberLines($property, $code)];
    }
    if ($members !== []) {
        $lines = [...$lines, '## Members', '', ...$members, ''];
    }
    $methods = \array_filter(
        $class->getMethods(ReflectionMethod::IS_PUBLIC),
        static fn(ReflectionMethod $method): bool => $method->getDeclaringClass()->getName()
            === $class->getName() && !isInternal($method->getDocComment())
            && !\in_array($method->getName(), ['cases', 'from', 'tryFrom'], true),
    );
    if ($methods !== []) {
        $lines[] = '## Methods';
        $lines[] = '';
        foreach ($methods as $method) {
            $lines = [...$lines, ...methodLines($method)];
        }
    }

    return $lines;
}

/**
 * @return list<ReflectionClass<object>> The public classes, enums and interfaces, by name.
 */
function publicClasses(string $source): array
{
    \spl_autoload_register(static function (string $name) use ($source): void {
        $file = $source . '/' . \str_replace('\\', '/', \substr($name, \strlen(PREFIX))) . '.php';
        if (\str_starts_with($name, PREFIX) && \is_file($file)) {
            require_once $file;
        }
    });
    $classes = [];
    $files = \glob($source . '/{,*/}*.php', \GLOB_BRACE);
    foreach ($files === false ? [] : $files as $file) {
        $path = \substr($file, \strlen($source) + 1, -4);
        $name = PREFIX . \str_replace('/', '\\', $path);
        $exists = \class_exists($name) || \interface_exists($name) || \enum_exists($name);
        if (!$exists) {
            throw new RuntimeException("{$file} holds no class named {$name}.");
        }
        $class = \enum_exists($name) ? new ReflectionEnum($name) : new ReflectionClass($name);
        if (!\str_contains($path, 'Internal') && !isInternal($class->getDocComment())) {
            $classes[$name] = $class;
        }
    }
    \ksort($classes);

    return \array_values($classes);
}

function slugOf(string $name): string
{
    return \strtolower(\str_replace('\\', '-', \substr($name, \strlen(PREFIX))));
}

/**
 * @param list<string> $arguments
 */
function writeReference(array $arguments): int
{
    if (\count($arguments) !== 2) {
        \fwrite(\STDERR, "Usage: php scripts/php-reference.php <package folder> <output folder>\n");

        return 2;
    }
    [$package, $output] = $arguments;
    $classes = publicClasses($package . '/src');
    if (!\is_dir($output) && !\mkdir($output, 0o777, true)) {
        throw new RuntimeException("Cannot make {$output}.");
    }
    $index = [
        '---',
        'title: gatepost/postcode',
        'description: The public classes and enums of the PHP package.',
        'editUrl: false',
        '---',
        '',
        'The doc comments of the PHP package give this reference. Each page lists the public',
        'members of one class or enum.',
        '',
    ];
    foreach ($classes as $class) {
        $name = $class->getName();
        $text = \implode("\n", classLines($class)) . "\n";
        \file_put_contents($output . '/' . slugOf($name) . '.md', $text);
        $index[] = '- [`' . \substr($name, \strlen(PREFIX)) . '`](' . slugOf($name) . '/)';
    }
    \file_put_contents($output . '/index.md', \implode("\n", $index) . "\n");

    return 0;
}

exit(writeReference(\array_slice($argv, 1)));
