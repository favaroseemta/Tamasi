import { SlashCommandBuilder } from 'discord.js';
import { createEmbed, successEmbed, infoEmbed, warningEmbed } from '../../utils/embeds.js';
import { logger } from '../../utils/logger.js';
import { replyUserError, ErrorTypes } from '../../utils/errorHandler.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';
const GEOCODING_URL = "https://geocoding-api.open-meteo.com/v1/search";
const WEATHER_URL = "https://api.open-meteo.com/v1/forecast";

export default {
    data: new SlashCommandBuilder()
        .setName("weather")
        .setDescription("Valos ideju idojarasi informaciok lekerese egy helyszinrol")
        .addStringOption((option) =>
            option
                .setName("city")
                .setDescription("A varos neve, pl. 'Budapest' vagy 'London'")
                .setRequired(true),
        ),

    async execute(interaction) {
        const deferSuccess = await InteractionHelper.safeDefer(interaction);
        if (!deferSuccess) {
            logger.warn(`Weather interaction defer failed`, {
                userId: interaction.user.id,
                guildId: interaction.guildId,
                commandName: 'weather'
            });
            return;
        }

        const city = interaction.options.getString("city");

        const geoResponse = await fetch(
            `${GEOCODING_URL}?name=${encodeURIComponent(city)}`,
        );
        const geoData = await geoResponse.json();

        if (!geoData.results || geoData.results.length === 0) {
            logger.info(`Weather command - city not found`, {
                userId: interaction.user.id,
                city: city,
                guildId: interaction.guildId
            });
            await replyUserError(interaction, { type: ErrorTypes.USER_INPUT, message: `Nem talalhato helyszin a kovetkezo kifejezesre: **${city}**. Kerlek ellenorizd a helyesirast.` });
            return;
        }

        const { latitude, longitude, name, country } = geoData.results[0];
        const cityDisplay = name;

        const weatherResponse = await fetch(
            `${WEATHER_URL}?latitude=${latitude}&longitude=${longitude}&current_weather=true`,
        );
        const weatherData = await weatherResponse.json();

        if (weatherData.error) {
            logger.error(`Weather API error`, {
                error: weatherData.reason,
                city: city,
                userId: interaction.user.id,
                guildId: interaction.guildId
            });
            await replyUserError(interaction, { type: ErrorTypes.UNKNOWN, message: 'Idojarasi szolgaltatas hiba tortent.' });
            return;
        }

        const current = weatherData.current || weatherData.current_weather || {};
        const temperature = current.temperature != null ? Math.round(current.temperature) : "N/A";
        const humidity = current.relativehumidity ?? current.relative_humidity_2m ?? "N/A";
        const windSpeed = current.windspeed != null ? Math.round(current.windspeed) : "N/A";
        const weatherCode = current.weathercode ?? current.weather_code ?? null;

        const condition = getWeatherDescription(weatherCode);

        const embed = createEmbed({ title: `Idojaras itt: ${cityDisplay}, ${country}`, description: condition.description })
            .addFields(
                {
                    name: "Homerseklet",
                    value: `${temperature}°C`,
                    inline: true,
                },
                {
                    name: "Paratartalom",
                    value: `${humidity}%`,
                    inline: true,
                },
                {
                    name: "Szelsebesseg",
                    value: `${windSpeed} km/h`,
                    inline: true,
                },
            )
            .setFooter({
                text: `Szelesseg: ${latitude.toFixed(2)} | Hosszusag: ${longitude.toFixed(2)}`,
            });

        await InteractionHelper.safeEditReply(interaction, { embeds: [embed] });
        logger.info(`Weather command executed`, {
            userId: interaction.user.id,
            city: cityDisplay,
            country: country,
            temperature: temperature,
            guildId: interaction.guildId
        });
    },
};

function getWeatherDescription(code) {
    if (code >= 0 && code <= 3) {
        return { description: "Tiszta ido / Reszben felhos", emoji: "" };
    } else if (code >= 45 && code <= 48) {
        return { description: "Kod", emoji: "" };
    } else if (code >= 51 && code <= 67) {
        return { description: "Szitallas vagy eso", emoji: "" };
    } else if (code >= 71 && code <= 75) {
        return { description: "Havazas", emoji: "" };
    } else if (code >= 80 && code <= 86) {
        return { description: "Zaporok (Eso/Ho)", emoji: "" };
    } else if (code >= 95 && code <= 99) {
        return { description: "Zivatar", emoji: "" };
    }
    return { description: "Ismeretlen korulmenyek.", emoji: "" };
}