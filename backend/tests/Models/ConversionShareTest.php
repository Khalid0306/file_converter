<?php

declare(strict_types=1);

namespace Tests\Models;

use App\Models\Conversion;
use PHPUnit\Framework\TestCase;

class ConversionShareTest extends TestCase
{
    public function testValidShareLinkWithFutureExpiry(): void
    {
        $future = (new \DateTime())->modify('+1 hour')->format('Y-m-d H:i:s');
        $this->assertTrue(Conversion::isShareValid('sometoken', $future));
    }

    public function testExpiredShareLinkIsInvalid(): void
    {
        $past = (new \DateTime())->modify('-1 hour')->format('Y-m-d H:i:s');
        $this->assertFalse(Conversion::isShareValid('sometoken', $past));
    }

    public function testNullTokenIsInvalid(): void
    {
        $future = (new \DateTime())->modify('+1 hour')->format('Y-m-d H:i:s');
        $this->assertFalse(Conversion::isShareValid(null, $future));
    }

    public function testNullExpiryIsInvalid(): void
    {
        $this->assertFalse(Conversion::isShareValid('sometoken', null));
    }

    public function testBothNullIsInvalid(): void
    {
        $this->assertFalse(Conversion::isShareValid(null, null));
    }
}