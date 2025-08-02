<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
                version="1.0">

  <xsl:output method="text" encoding="UTF-8"/>

  <!-- Prendi il prefix e passa ai vocabolari -->
  <xsl:template match="/vocabularies">
    <xsl:variable name="prefix" select="prefix/@value"/>
    <xsl:apply-templates select="vocabulary">
      <xsl:with-param name="prefix" select="$prefix"/>
    </xsl:apply-templates>
  </xsl:template>

  <!-- Vocabolario -->
  <xsl:template match="vocabulary">
    <xsl:param name="prefix"/>
    <xsl:variable name="vocab-id" select="@id"/>
    <xsl:apply-templates select="term">
      <xsl:with-param name="path" select="concat('http://', $prefix, $vocab-id)"/>
    </xsl:apply-templates>
  </xsl:template>

  <!-- Term ricorsivo -->
  <xsl:template match="term">
    <xsl:param name="path"/>
    <xsl:variable name="current-id" select="@id"/>
    <xsl:variable name="new-path" select="concat($path, '/', $current-id)"/>

    <xsl:choose>
      <!-- Se NON ha sub-terms/term -->
      <xsl:when test="not(sub-terms/term)">
        <xsl:for-each select="name">
          <xsl:value-of select="$new-path"/>
          <xsl:text> rdfs:label "</xsl:text>
          <xsl:value-of select="."/>
          <xsl:text>"@</xsl:text>
          <xsl:value-of select="@lang"/>
          <xsl:text>&#10;</xsl:text>
        </xsl:for-each>
      </xsl:when>
      <xsl:otherwise>
        <xsl:apply-templates select="sub-terms/term">
          <xsl:with-param name="path" select="$new-path"/>
        </xsl:apply-templates>
      </xsl:otherwise>
    </xsl:choose>
  </xsl:template>

</xsl:stylesheet>